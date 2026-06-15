const { test, expect } = require('@playwright/test');

/**
 * Quiz Bee — Full Game Loop E2E Test
 *
 * Spawns 3 browser contexts (Host, Big Screen, Participant) and walks
 * through the entire game lifecycle:
 *   A. Host logs in, creates a question set, adds a question, saves
 *   B. Host starts game → Screen shows lobby
 *   C. Participant joins
 *   D. Host launches question → Participant answers
 *   E. Host reveals answer → Scores appear
 *   F. Host ends game → Final results
 *
 * Pre-requisites:
 *   - Backend running on port 3001
 *   - Client dev server running on port 5173 (with /api proxy to 3001)
 */

test.describe('Quiz Bee Full Game Loop', () => {
  // Increase timeout — this is a full multi-actor E2E flow
  test.setTimeout(120_000);

  test('completes a full game from host creation to participant joining and answering', async ({ browser }) => {

    // ─── Create contexts ───
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    const screenContext = await browser.newContext();
    const screenPage = await screenContext.newPage();

    const participantContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const participantPage = await participantContext.newPage();

    // ═══════════════════════════════════════
    // A. HOST: Login → Editor → Create Set → Add Question → Save
    // ═══════════════════════════════════════

    // ═══════════════════════════════════════
    // Pre-requisite: Reset Room State via direct socket connection
    // ═══════════════════════════════════════
    const io = require('../../client/node_modules/socket.io-client');
    const resetPromise = new Promise((resolve) => {
      const socket = io('http://localhost:3001');
      socket.on('connect', () => {
        socket.emit('host:auth', { pin: '1234' });
      });
      socket.on('host:auth_success', () => {
        socket.emit('host:reset_room');
      });
      socket.on('host:room_reset', () => {
        socket.disconnect();
        resolve();
      });
    });
    await resetPromise;

    // A1. Login
    await hostPage.goto('/host/login');
    await hostPage.fill('input[placeholder="Host PIN"]', '1234');
    await hostPage.click('button:has-text("Login")');

    // Wait for Dashboard to load and verify it's the "Start New Game" view (Lobby state)
    await expect(hostPage.locator('h2:has-text("Start New Game")')).toBeVisible({ timeout: 15000 });
    await hostPage.goto('/host');
    await hostPage.fill('input[placeholder="Host PIN"]', '1234');
    await hostPage.click('button:has-text("Login")');
    await expect(hostPage.locator('h2:has-text("Start New Game")')).toBeVisible({ timeout: 15000 });

    // A2. Navigate to Editor
    await hostPage.click('a:has-text("Editor")');
    await expect(hostPage.locator('button:has-text("+ New Set")')).toBeVisible({ timeout: 10000 });

    // A3. Create a new question set (with retry for transient proxy errors)
    let setCreated = false;
    for (let attempt = 0; attempt < 3 && !setCreated; attempt++) {
      // Register dialog handler BEFORE clicking
      hostPage.once('dialog', async dialog => {
        await dialog.accept('E2E Test Set');
      });

      // Wait for the POST /api/question-sets response
      const createPromise = hostPage.waitForResponse(
        res => res.url().includes('/api/question-sets') && res.request().method() === 'POST'
      );
      await hostPage.click('button:has-text("+ New Set")');
      const createRes = await createPromise;
      
      if (createRes.status() === 200) {
        setCreated = true;
      } else {
        console.log(`POST /api/question-sets returned ${createRes.status()}, retrying (${attempt + 1}/3)...`);
        await hostPage.waitForTimeout(2000);
      }
    }
    expect(setCreated).toBe(true);

    // Wait for the Editor to load questions for the newly selected set
    // The "Questions" heading with "+ Add" button only appears when selectedSetId is set
    await expect(hostPage.locator('button:has-text("+ Add")')).toBeVisible({ timeout: 10000 });

    // A4. Add a question
    await hostPage.click('button:has-text("+ Add")');

    // Wait for the edit form to appear (textarea for question text)
    await expect(hostPage.locator('textarea')).toBeVisible({ timeout: 5000 });

    // Clear the default "New Question" text and type our question
    await hostPage.locator('textarea').fill('What is the color of the sky?');

    // The question type dropdown is the SECOND select on the page (first is the set selector)
    // It should already default to 'mcq', but let's make sure
    const typeSelect = hostPage.locator('select').nth(1);
    await typeSelect.selectOption('mcq');

    // Fill option A text — default value is "Option 1", placeholder is "Option Text"
    // Clear and fill the first option text input
    const optionAText = hostPage.locator('input[placeholder="Option Text"]').first();
    await optionAText.fill('Blue');

    // Make sure A is the correct answer (check the first radio button)
    await hostPage.locator('input[name="correct_answer"]').first().check();

    // A5. Save
    // Register dialog handler for the "saved successfully" alert
    hostPage.once('dialog', async dialog => {
      await dialog.accept();
    });
    const savePromise = hostPage.waitForResponse(
      res => res.url().includes('/api/questions/') && res.request().method() === 'POST'
    );
    await hostPage.click('button:has-text("Save All Changes")');
    const saveRes = await savePromise;
    expect(saveRes.status()).toBe(200);

    // ═══════════════════════════════════════
    // B. HOST: Start Game
    // ═══════════════════════════════════════

    // Navigate back to Dashboard
    await hostPage.click('a:has-text("Dashboard")');
    await expect(hostPage.locator('h2:has-text("Start New Game")')).toBeVisible({ timeout: 10000 });

    // Select the question set we created
    await hostPage.locator('select').selectOption({ label: 'E2E Test Set' });

    // We need at least 1 participant before starting — so first set up screen and participant

    // ═══════════════════════════════════════
    // C. SCREEN: Open lobby
    // ═══════════════════════════════════════

    await screenPage.goto('/screen/lobby');
    // Screen first shows "Connecting..." until socket registers, then shows participant grid
    // Wait for the screen to finish registering (the "Participants" heading appears)
    await expect(screenPage.locator('h2:has-text("Participants")')).toBeVisible({ timeout: 20000 });

    // ═══════════════════════════════════════
    // D. PARTICIPANT: Join the game
    // ═══════════════════════════════════════

    await participantPage.goto('/join');
    await expect(participantPage.locator('h1:has-text("Join Game")')).toBeVisible({ timeout: 10000 });

    await participantPage.fill('input[placeholder="Room PIN"]', '000000');
    await participantPage.fill('input[placeholder="Display Name"]', 'E2E Tester');
    await participantPage.fill('input[placeholder="Section (e.g. BSCS-3A)"]', 'QA-101');
    // Wait for socket to connect (button text changes from Connecting... to Join)
    await expect(participantPage.locator('button:has-text("Join")')).toBeEnabled({ timeout: 10000 });
    
    // Check if there is an error message displayed before clicking Join
    participantPage.on('console', msg => console.log('Participant log:', msg.text()));
    
    await participantPage.click('button:has-text("Join")');

    // Participant should land on Lobby
    try {
      await expect(participantPage.locator('text=Waiting for the host')).toBeVisible({ timeout: 15000 });
    } catch (e) {
      console.log('Failed to find Waiting for host. Taking screenshot.');
      await participantPage.screenshot({ path: 'debug-participant-lobby.png' });
      // Check if there's an error displayed on the form
      const errorText = await participantPage.locator('.text-danger').textContent().catch(() => 'No error text found');
      console.log('Form error text:', errorText);
      throw e;
    }

    // Screen should show the participant name
    await expect(screenPage.locator('text=E2E Tester')).toBeVisible({ timeout: 10000 });

    // ═══════════════════════════════════════
    // E. HOST: Start Game (now we have 1 participant)
    // ═══════════════════════════════════════

    await hostPage.click('button:has-text("Start Game")');
    await expect(hostPage.locator('h2:has-text("Game Controls")')).toBeVisible({ timeout: 15000 });

    // ═══════════════════════════════════════
    // F. HOST: Launch Question → Participant answers
    // ═══════════════════════════════════════

    // Host should see a question preview with "Launch Question" button
    await expect(hostPage.locator('button:has-text("Launch Question")')).toBeVisible({ timeout: 10000 });
    await hostPage.click('button:has-text("Launch Question")');

    // Participant should see the question text
    await expect(participantPage.locator('text=What is the color of the sky?')).toBeVisible({ timeout: 15000 });

    // Participant clicks the "Blue" option button
    await participantPage.locator('button', { hasText: 'Blue' }).first().click();

    // After answering, participant should see "Answer Locked!" or "Waiting for others"
    await expect(participantPage.locator('text=Answer Locked')).toBeVisible({ timeout: 10000 });

    // ═══════════════════════════════════════
    // G. HOST: Reveal Answer
    // ═══════════════════════════════════════

    // Wait for the "Reveal Answer" button (appears after timer expires or all answered)
    try {
      await expect(hostPage.locator('button:has-text("Reveal Answer")')).toBeVisible({ timeout: 35000 });
    } catch (e) {
      console.log('Failed to find Reveal Answer. Taking host page screenshot.');
      await hostPage.screenshot({ path: 'debug-host-reveal.png' });
      const html = await hostPage.content();
      require('fs').writeFileSync('debug-host-dom.html', html);
      throw e;
    }
    await hostPage.click('button:has-text("Reveal Answer")');

    // Participant should see their score update (correct answer!)
    await expect(participantPage.locator('text=Correct')).toBeVisible({ timeout: 10000 });

    // Screen should show the correct answer reveal
    await expect(screenPage.locator('text=Correct Answer')).toBeVisible({ timeout: 10000 });

    // ═══════════════════════════════════════
    // H. HOST: End Game
    // ═══════════════════════════════════════

    // Wait for "End Game" button
    try {
      await expect(hostPage.locator('button:has-text("End Game")')).toBeVisible({ timeout: 10000 });
    } catch (e) {
      console.log('Failed to find End Game. Taking host page screenshot.');
      await hostPage.screenshot({ path: 'debug-host-endgame.png' });
      const html = await hostPage.content();
      require('fs').writeFileSync('debug-host-endgame.html', html);
      throw e;
    }
    await hostPage.click('button:has-text("End Game")');

    // Screen should show final results / podium
    await expect(screenPage.locator('text=Final Results')).toBeVisible({ timeout: 10000 });

    // Participant should see their result
    await expect(participantPage.locator('text=E2E Tester')).toBeVisible({ timeout: 10000 });

    // ═══════════════════════════════════════
    // Cleanup
    // ═══════════════════════════════════════
    await hostContext.close();
    await screenContext.close();
    await participantContext.close();
  });
});
