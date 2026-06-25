import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiPath } from '../../config/api';

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const MIN_MCQ_OPTIONS = 2;
const MAX_MCQ_OPTIONS = 6;

const createMcqOptions = (count = 4) => OPTION_LABELS.slice(0, count).map(label => ({ label, text: '' }));
const TRUE_FALSE_OPTIONS = [
  { label: 'A', text: 'True' },
  { label: 'B', text: 'False' }
];

interface SortableQuestionItemProps {
  id: string;
  question: any;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function SortableQuestionItem({ id, question, isActive, onClick, onDelete }: SortableQuestionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '10px',
    margin: '8px 0',
    backgroundColor: isActive ? 'var(--color-yellow)' : 'var(--color-surface)',
    border: '3px solid var(--color-border)',
    borderRadius: '0',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }} {...attributes} {...listeners}>
        <span style={{ cursor: 'grab', color: 'var(--text-secondary)', fontWeight: 900 }}>::</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
          {question.text || 'Untitled Question'}
        </span>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="bau-button danger" style={{ minHeight: 36, padding: '4px 10px' }} type="button">
        X
      </button>
    </div>
  );
}

export default function Editor() {
  const { isHostAuthenticated } = useSocket();
  const navigate = useNavigate();
  const [questionSets, setQuestionSets] = useState<any[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isJsonImportOpen, setIsJsonImportOpen] = useState(false);
  const [jsonImportText, setJsonImportText] = useState('');

  useEffect(() => {
    if (!isHostAuthenticated) {
      navigate('/host/login');
      return;
    }
    fetchSets();
  }, [isHostAuthenticated, navigate]);

  const fetchSets = async () => {
    try {
      const res = await fetch(apiPath('/api/question-sets'));
      const data = await res.json();
      setQuestionSets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!selectedSetId) {
      setQuestions([]);
      setActiveQuestionId(null);
      return;
    }

    fetch(apiPath(`/api/questions/${selectedSetId}`))
      .then(res => res.json())
      .then(data => {
        const qList = data.map((q: any) => normalizeQuestion(q));
        setQuestions(qList);
        setActiveQuestionId(qList.length > 0 ? qList[0]._dndId : null);
      })
      .catch(console.error);
  }, [selectedSetId]);

  const normalizeQuestion = (q: any) => {
    const type = q.type || 'mcq';
    let options = q.options || null;
    let correct_answer = q.correct_answer || '';

    if (type === 'truefalse') {
      options = TRUE_FALSE_OPTIONS;
      if (correct_answer === 'True') correct_answer = 'A';
      if (correct_answer === 'False') correct_answer = 'B';
      if (!['A', 'B'].includes(correct_answer)) correct_answer = 'A';
    }

    if (type === 'mcq') {
      const sourceOptions = Array.isArray(options) ? options : createMcqOptions();
      options = sourceOptions
        .slice(0, MAX_MCQ_OPTIONS)
        .map((opt: any, index: number) => ({ label: OPTION_LABELS[index], text: opt?.text || '' }));
      while (options.length < MIN_MCQ_OPTIONS) options.push({ label: OPTION_LABELS[options.length], text: '' });
      if (!options.some((opt: any) => opt.label === correct_answer)) correct_answer = options[0].label;
    }

    return {
      ...q,
      type,
      options,
      correct_answer,
      timer_seconds: q.timer_seconds || 30,
      _dndId: q._dndId || q.id || Math.random().toString(36).substring(2, 11)
    };
  };

  const serializeQuestion = (q: any) => {
    if (q.type === 'truefalse') {
      return {
        ...q,
        options: TRUE_FALSE_OPTIONS,
        correct_answer: q.correct_answer === 'B' ? 'B' : 'A'
      };
    }
    if (q.type === 'mcq') {
      return {
        ...q,
        options: (q.options || []).map((opt: any, index: number) => ({ label: OPTION_LABELS[index], text: opt.text || '' })),
        correct_answer: q.correct_answer || 'A'
      };
    }
    return { ...q, options: null };
  };

  const handleCreateSet = async () => {
    const name = prompt('Enter name for the new Question Set:');
    if (!name) return;

    const res = await fetch(apiPath('/api/question-sets'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scoring_config: { base_points: 1000, speed_bonus_max: 500 } })
    });
    const newSet = await res.json();
    await fetchSets();
    setSelectedSetId(newSet.id);
  };

  const handleDeleteSet = async () => {
    const selectedSet = questionSets.find(set => String(set.id) === String(selectedSetId));
    if (!selectedSet) return;
    const confirmed = window.confirm(`Delete "${selectedSet.name || selectedSet.title}" and all of its questions? This cannot be undone.`);
    if (!confirmed) return;

    const res = await fetch(apiPath(`/api/question-sets/${selectedSetId}`), { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Failed to delete question set.');
      return;
    }

    setSelectedSetId('');
    setQuestions([]);
    setActiveQuestionId(null);
    await fetchSets();
  };

  const handleSaveQuestions = async () => {
    if (!selectedSetId) return;
    const prepared = questions.map(q => serializeQuestion(q));
    const invalid = prepared.find(q => q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length < MIN_MCQ_OPTIONS || q.options.some((opt: any) => !opt.text.trim())));
    if (invalid) {
      alert('Every multiple-choice option must have text before saving.');
      return;
    }

    try {
      const res = await fetch(apiPath(`/api/questions/${selectedSetId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: prepared })
      });
      alert(res.ok ? 'Questions saved successfully!' : 'Failed to save questions.');
    } catch (e: any) {
      alert('Error saving questions: ' + e.message);
    }
  };

  const handleAddQuestion = () => {
    const newId = Math.random().toString(36).substring(2, 11);
    const newQ = normalizeQuestion({
      _dndId: newId,
      text: '',
      type: 'mcq',
      timer_seconds: 30,
      correct_answer: 'A',
      options: createMcqOptions(4)
    });
    setQuestions([...questions, newQ]);
    setActiveQuestionId(newId);
  };

  const handleDeleteQuestion = (idToDelete: string) => {
    const updated = questions.filter(q => q._dndId !== idToDelete);
    setQuestions(updated);
    if (activeQuestionId === idToDelete) setActiveQuestionId(updated.length > 0 ? updated[0]._dndId : null);
  };

  const updateActiveQuestion = (updates: any) => {
    setQuestions(questions.map(q => q._dndId === activeQuestionId ? { ...q, ...updates } : q));
  };

  const updateOptionText = (index: number, value: string) => {
    const activeQ = questions.find(q => q._dndId === activeQuestionId);
    if (!activeQ || !activeQ.options) return;
    const newOptions = [...activeQ.options];
    newOptions[index] = { ...newOptions[index], text: value };
    updateActiveQuestion({ options: newOptions });
  };

  const handleAddOption = () => {
    const activeQ = questions.find(q => q._dndId === activeQuestionId);
    if (!activeQ || activeQ.type !== 'mcq' || activeQ.options.length >= MAX_MCQ_OPTIONS) return;
    updateActiveQuestion({ options: [...activeQ.options, { label: OPTION_LABELS[activeQ.options.length], text: '' }] });
  };

  const handleDeleteOption = (index: number) => {
    const activeQ = questions.find(q => q._dndId === activeQuestionId);
    if (!activeQ || activeQ.type !== 'mcq' || activeQ.options.length <= MIN_MCQ_OPTIONS) return;
    const options = activeQ.options.filter((_: any, i: number) => i !== index).map((opt: any, i: number) => ({ ...opt, label: OPTION_LABELS[i] }));
    const correct_answer = options.some((opt: any) => opt.label === activeQ.correct_answer) ? activeQ.correct_answer : options[0].label;
    updateActiveQuestion({ options, correct_answer });
  };

  const handleTypeChange = (type: string) => {
    if (type === 'truefalse') {
      updateActiveQuestion({ type, correct_answer: 'A', options: TRUE_FALSE_OPTIONS });
      return;
    }
    if (type === 'mcq') {
      updateActiveQuestion({ type, correct_answer: 'A', options: createMcqOptions(4) });
      return;
    }
    updateActiveQuestion({ type, correct_answer: '', options: null });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleExportJSON = () => {
    if (questions.length === 0) return alert('No questions to export');
    const cleanQuestions = questions.map(({ _dndId, id, ...rest }) => serializeQuestion(rest));
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cleanQuestions, null, 2));
    downloadData(dataStr, `question_set_${selectedSetId}.json`);
  };

  const handleExportCSV = () => {
    if (questions.length === 0) return alert('No questions to export');
    const headers = ['text', 'type', 'timer_seconds', 'correct_answer', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f'];
    const rows = questions.map(q => {
      const serialized = serializeQuestion(q);
      const options = serialized.options || [];
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        escape(serialized.text),
        escape(serialized.type),
        serialized.timer_seconds || 30,
        escape(serialized.correct_answer),
        ...OPTION_LABELS.map((_, index) => escape(options[index]?.text || ''))
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
    downloadData(csvContent, `question_set_${selectedSetId}.csv`);
  };

  const downloadData = (href: string, filename: string) => {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', href);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const parseCSVLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const importQuestions = (importedQuestions: any[]) => {
    const validated = importedQuestions.map((q, index) => validateImportedQuestion(q, index + 1));
    setQuestions([...questions, ...validated]);
    if (validated.length > 0) setActiveQuestionId(validated[0]._dndId);
    alert(`Successfully imported ${validated.length} questions! Click "Save All Changes" to persist.`);
  };

  const handleCsvFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        if (!file.name.endsWith('.csv')) throw new Error('Unsupported file format. Please upload a .csv file');
        importQuestions(parseCsvQuestions(content));
      } catch (err: any) {
        alert(`CSV Import Failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleJsonPasteImport = () => {
    try {
      const parsed = JSON.parse(jsonImportText);
      if (!Array.isArray(parsed)) throw new Error('Root must be a JSON array of questions');
      importQuestions(parsed);
      setJsonImportText('');
      setIsJsonImportOpen(false);
    } catch (err: any) {
      alert(`JSON Import Failed: ${err.message}`);
    }
  };
  const parseCsvQuestions = (content: string) => {
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length <= 1) throw new Error('CSV is empty or missing headers');
    const headers = parseCSVLine(lines[0]);
    const required = ['text', 'type', 'correct_answer'];
    for (const header of required) {
      if (!headers.includes(header)) throw new Error('CSV must contain text, type, and correct_answer headers');
    }

    return lines.slice(1).map(line => {
      const cols = parseCSVLine(line);
      const value = (header: string) => cols[headers.indexOf(header)] || '';
      const type = value('type') || 'mcq';
      const optionValues = OPTION_LABELS.map(label => value(`option_${label.toLowerCase()}`)).filter(Boolean);
      return {
        text: value('text'),
        type,
        timer_seconds: parseInt(value('timer_seconds') || '30'),
        correct_answer: value('correct_answer'),
        options: type === 'mcq'
          ? optionValues.map((text, index) => ({ label: OPTION_LABELS[index], text }))
          : type === 'truefalse'
            ? TRUE_FALSE_OPTIONS
            : null
      };
    }).filter(q => q.text);
  };

  const validateImportedQuestion = (q: any, rowNum: number) => {
    const normalized = normalizeQuestion(q);
    if (!normalized.text || typeof normalized.text !== 'string' || !normalized.text.trim()) throw new Error(`Question ${rowNum}: Question text is required`);
    if (!['mcq', 'truefalse', 'identification'].includes(normalized.type)) throw new Error(`Question ${rowNum}: Invalid type "${normalized.type}"`);
    if (isNaN(normalized.timer_seconds) || normalized.timer_seconds <= 0) throw new Error(`Question ${rowNum}: timer_seconds must be a positive integer`);
    if (!normalized.correct_answer || typeof normalized.correct_answer !== 'string' || !normalized.correct_answer.trim()) throw new Error(`Question ${rowNum}: correct_answer is required`);
    if (normalized.type === 'mcq') {
      if (!Array.isArray(normalized.options) || normalized.options.length < MIN_MCQ_OPTIONS || normalized.options.length > MAX_MCQ_OPTIONS) {
        throw new Error(`Question ${rowNum} (mcq): options must contain 2 to 6 elements`);
      }
      if (normalized.options.some((opt: any) => !opt.text.trim())) throw new Error(`Question ${rowNum} (mcq): option text cannot be blank`);
      if (!normalized.options.some((opt: any) => opt.label === normalized.correct_answer)) throw new Error(`Question ${rowNum} (mcq): correct_answer must match an option label`);
    }
    if (normalized.type === 'truefalse' && !['A', 'B'].includes(normalized.correct_answer)) throw new Error(`Question ${rowNum} (truefalse): correct_answer must be A or B`);
    return normalized;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex(i => i._dndId === active.id);
        const newIndex = items.findIndex(i => i._dndId === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (!isHostAuthenticated) return null;

  const activeQ = questions.find(q => q._dndId === activeQuestionId);
  const visibleOptions = activeQ?.type === 'truefalse' ? TRUE_FALSE_OPTIONS : (activeQ?.options || []);
  const selectedSet = questionSets.find(set => String(set.id) === String(selectedSetId));

  return (
    <div className="host-shell">
      <nav className="host-nav">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span className="brand-dot" /><span className="brand-square" /><span className="brand-triangle" /></span><span>JPCS Quiz Game Host</span></div>
        <div className="bau-row"><Link to="/host" className="bau-button ghost">Dashboard</Link></div>
      </nav>

      <main className="host-main bau-stack">
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={selectedSetId} onChange={e => setSelectedSetId(e.target.value)} className="bau-select" style={{ flex: '1 1 320px' }}>
            <option value="">Select Question Set to Edit</option>
            {questionSets.map(s => <option key={s.id} value={s.id}>{s.name || s.title}</option>)}
          </select>
          <button onClick={handleCreateSet} className="bau-button secondary" type="button">+ New Set</button>
          {selectedSetId && <button onClick={handleDeleteSet} className="bau-button danger" type="button">Delete Set</button>}
          {selectedSet && <span className="bau-kicker">Editing: {selectedSet.name || selectedSet.title}</span>}
        </div>

        {selectedSetId && (
          <>
            <div className="bau-row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={handleExportJSON} className="bau-button secondary" type="button">Export JSON</button>
              <button onClick={handleExportCSV} className="bau-button secondary" type="button">Export CSV</button>
              <label className="bau-button secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', margin: 0 }}>
                Import CSV File
                <input type="file" accept=".csv" onChange={handleCsvFileImport} style={{ display: 'none' }} />
              </label>
              <button onClick={() => setIsJsonImportOpen(true)} className="bau-button secondary" type="button">Paste JSON</button>
              <button onClick={handleSaveQuestions} className="bau-button primary" type="button">Save All Changes</button>
            </div>

            {isJsonImportOpen && (
              <section className="bau-card compact bau-stack">
                <div className="bau-row between">
                  <div>
                    <h2 className="bau-title-md">Paste JSON Questions</h2>
                    <p className="bau-meta">Paste a JSON array of question objects, then import it into this set.</p>
                  </div>
                  <button className="bau-button ghost" type="button" onClick={() => setIsJsonImportOpen(false)}>Close</button>
                </div>
                <textarea
                  className="bau-textarea"
                  style={{ minHeight: 220, fontFamily: 'monospace' }}
                  value={jsonImportText}
                  onChange={(e) => setJsonImportText(e.target.value)}
                  placeholder='[{"text":"What does HTML stand for?","type":"mcq","timer_seconds":30,"correct_answer":"A","options":[{"label":"A","text":"HyperText Markup Language"}]}]'
                />
                <div className="bau-row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="bau-button ghost" type="button" onClick={() => { setJsonImportText(''); setIsJsonImportOpen(false); }}>Cancel</button>
                  <button className="bau-button primary" type="button" onClick={handleJsonPasteImport} disabled={!jsonImportText.trim()}>Import JSON</button>
                </div>
              </section>
            )}

            <div className="editor-grid" style={{ flex: 1 }}>
              <div className="bau-card question-list">
                <div className="bau-row between" style={{ marginBottom: 'var(--space-md)' }}>
                  <h3>Questions ({questions.length})</h3>
                  <button onClick={handleAddQuestion} className="bau-button secondary" type="button">+ Add</button>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={questions.map(q => q._dndId)} strategy={verticalListSortingStrategy}>
                    {questions.map((q) => (
                      <SortableQuestionItem key={q._dndId} id={q._dndId} question={q} isActive={q._dndId === activeQuestionId} onClick={() => setActiveQuestionId(q._dndId)} onDelete={() => handleDeleteQuestion(q._dndId)} />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>

              {activeQ ? (
                <div className="bau-card bau-stack">
                  <h3>Edit Question</h3>
                  <label><span className="bau-label">Question Text</span><textarea value={activeQ.text} onChange={e => updateActiveQuestion({ text: e.target.value })} className="bau-textarea" placeholder="Type the question shown to players" /></label>
                  <div className="bau-grid two">
                    <label><span className="bau-label">Type</span><select value={activeQ.type} onChange={e => handleTypeChange(e.target.value)} className="bau-input"><option value="mcq">Multiple Choice</option><option value="truefalse">True / False</option><option value="identification">Identification</option></select></label>
                    <label><span className="bau-label">Timer (Seconds)</span><input type="number" value={activeQ.timer_seconds} onChange={e => updateActiveQuestion({ timer_seconds: parseInt(e.target.value) })} className="bau-input" min={1} /></label>
                  </div>

                  {(activeQ.type === 'mcq' || activeQ.type === 'truefalse') && (
                    <div className="bau-stack">
                      <div className="bau-row between"><span className="bau-label">Options</span>{activeQ.type === 'mcq' && <button className="bau-button secondary" type="button" onClick={handleAddOption} disabled={visibleOptions.length >= MAX_MCQ_OPTIONS}>Add Option</button>}</div>
                      {visibleOptions.map((opt: any, i: number) => (
                        <div key={opt.label} className="option-editor-row">
                          <input type="radio" name="correct_answer" checked={activeQ.correct_answer === opt.label} onChange={() => updateActiveQuestion({ correct_answer: opt.label })} aria-label={`Mark option ${opt.label} correct`} />
                          <div className="answer-label">{opt.label}</div>
                          <input type="text" value={opt.text} onChange={e => updateOptionText(i, e.target.value)} className="bau-input" placeholder={`Option ${opt.label} text`} disabled={activeQ.type === 'truefalse'} />
                          {activeQ.type === 'mcq' && <button className="bau-button danger" type="button" onClick={() => handleDeleteOption(i)} disabled={visibleOptions.length <= MIN_MCQ_OPTIONS}>Delete</button>}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeQ.type === 'identification' && (
                    <label><span className="bau-label">Exact Correct Answer</span><input type="text" value={activeQ.correct_answer} onChange={e => updateActiveQuestion({ correct_answer: e.target.value })} className="bau-input" placeholder="Type the exact accepted answer" /></label>
                  )}
                </div>
              ) : (
                <div className="bau-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px' }}><p className="text-muted">Select a question to edit.</p></div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
