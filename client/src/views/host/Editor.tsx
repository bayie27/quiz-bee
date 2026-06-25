import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiPath } from '../../config/api';

const MCQ_OPTIONS = [
  { label: 'A', text: 'Option 1' },
  { label: 'B', text: 'Option 2' },
  { label: 'C', text: 'Option 3' },
  { label: 'D', text: 'Option 4' }
];

const TRUE_FALSE_OPTIONS = [
  { label: 'True', text: 'True' },
  { label: 'False', text: 'False' }
];

interface SortableQuestionItemProps {
  id: string;
  question: any;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

// --- Sortable Item Component ---
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }} {...attributes} {...listeners}>
        <span style={{ cursor: 'grab', color: 'var(--text-secondary)' }}>☰</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
          {question.text || 'New Question'}
        </span>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
        className="bau-button danger" style={{ minHeight: 36, padding: '4px 10px' }}
      >
        ×
      </button>
    </div>
  );
}

// --- Main Editor Component ---
export default function Editor() {
  const { isHostAuthenticated } = useSocket();
  const navigate = useNavigate();

  const [questionSets, setQuestionSets] = useState<any[]>([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Load Question Sets
  useEffect(() => {
    if (!isHostAuthenticated) {
      navigate('/host/login');
      return;
    }
    fetchSets();
  }, [isHostAuthenticated, navigate]);

  const fetchSets = () => {
    fetch(apiPath('/api/question-sets'))
      .then(res => res.json())
      .then(data => setQuestionSets(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  // Load Questions when a Set is selected
  useEffect(() => {
    if (selectedSetId === 'new') {
      setQuestions([]);
      setActiveQuestionId(null);
    } else if (selectedSetId) {
      fetch(apiPath(`/api/questions/${selectedSetId}`))
        .then(res => res.json())
        .then(data => {
          // Add temporary random IDs for dnd-kit if they don't have one
          const qList = data.map((q: any) => ({
            ...q,
            options: q.type === 'truefalse' ? TRUE_FALSE_OPTIONS : q.options,
            correct_answer: q.type === 'truefalse' && !['True', 'False'].includes(q.correct_answer)
              ? 'True'
              : q.correct_answer,
            _dndId: q.id || Math.random().toString(36).substring(2, 11)
          }));
          setQuestions(qList);
          setActiveQuestionId(qList.length > 0 ? qList[0]._dndId : null);
        });
    } else {
      setQuestions([]);
      setActiveQuestionId(null);
    }
  }, [selectedSetId]);

  const handleCreateSet = async () => {
    const name = prompt('Enter name for the new Question Set:');
    if (!name) return;

    const res = await fetch(apiPath('/api/question-sets'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, scoring_config: { base: 1000, speed_bonus_max: 500 } })
    });
    const newSet = await res.json();
    await fetchSets();
    setSelectedSetId(newSet.id);
  };

  const handleSaveQuestions = async () => {
    if (!selectedSetId || selectedSetId === 'new') return;
    try {
      const res = await fetch(apiPath(`/api/questions/${selectedSetId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions })
      });
      if (res.ok) {
        alert('Questions saved successfully!');
      } else {
        alert('Failed to save questions.');
      }
    } catch (e: any) {
      alert('Error saving questions: ' + e.message);
    }
  };

  const handleAddQuestion = () => {
    const newId = Math.random().toString(36).substring(2, 11);
    const newQ = {
      _dndId: newId,
      text: 'New Question',
      type: 'mcq',
      timer_seconds: 30,
      correct_answer: 'A',
      options: MCQ_OPTIONS
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionId(newId);
  };

  const handleDeleteQuestion = (idToDelete: string) => {
    const updated = questions.filter(q => q._dndId !== idToDelete);
    setQuestions(updated);
    if (activeQuestionId === idToDelete) {
      setActiveQuestionId(updated.length > 0 ? updated[0]._dndId : null);
    }
  };

  const updateActiveQuestion = (updates: any) => {
    setQuestions(questions.map(q => q._dndId === activeQuestionId ? { ...q, ...updates } : q));
  };

  const updateOption = (index: number, field: string, value: string) => {
    const activeQ = questions.find(q => q._dndId === activeQuestionId);
    if (!activeQ || !activeQ.options) return;
    const newOptions = [...activeQ.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    updateActiveQuestion({ options: newOptions });
  };

  const handleTypeChange = (type: string) => {
    if (type === 'truefalse') {
      updateActiveQuestion({
        type,
        correct_answer: 'True',
        options: TRUE_FALSE_OPTIONS
      });
      return;
    }

    if (type === 'mcq') {
      updateActiveQuestion({
        type,
        correct_answer: 'A',
        options: MCQ_OPTIONS
      });
      return;
    }

    updateActiveQuestion({
      type,
      correct_answer: '',
      options: null
    });
  };

  // Drag and drop setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleExportJSON = () => {
    if (questions.length === 0) return alert('No questions to export');
    // Remove temporary _dndId for a clean export
    const cleanQuestions = questions.map(({ _dndId, id, ...rest }) => rest);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanQuestions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `question_set_${selectedSetId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    if (questions.length === 0) return alert('No questions to export');
    const headers = ['text', 'type', 'timer_seconds', 'correct_answer', 'option_a', 'option_b', 'option_c', 'option_d'];
    const rows = questions.map(q => {
      const optA = q.options?.[0]?.text || '';
      const optB = q.options?.[1]?.text || '';
      const optC = q.options?.[2]?.text || '';
      const optD = q.options?.[3]?.text || '';
      
      const escape = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;
      
      return [
        escape(q.text),
        escape(q.type),
        q.timer_seconds || 30,
        escape(q.correct_answer),
        escape(optA),
        escape(optB),
        escape(optC),
        escape(optD)
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent([headers.join(','), ...rows].join('\n'));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `question_set_${selectedSetId}.csv`);
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
          i++; // skip next quote
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

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        let importedQuestions: any[] = [];
        
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (!Array.isArray(parsed)) throw new Error('Root must be a JSON array of questions');
          importedQuestions = parsed;
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
          if (lines.length <= 1) throw new Error('CSV is empty or missing headers');
          
          const headers = parseCSVLine(lines[0]);
          const textIdx = headers.indexOf('text');
          const typeIdx = headers.indexOf('type');
          const timerIdx = headers.indexOf('timer_seconds');
          const correctIdx = headers.indexOf('correct_answer');
          const optAIdx = headers.indexOf('option_a');
          const optBIdx = headers.indexOf('option_b');
          const optCIdx = headers.indexOf('option_c');
          const optDIdx = headers.indexOf('option_d');
          
          if (textIdx === -1 || typeIdx === -1 || correctIdx === -1) {
            throw new Error('CSV must contain at least "text", "type", and "correct_answer" headers');
          }
          
          for (let i = 1; i < lines.length; i++) {
            const cols = parseCSVLine(lines[i]);
            if (cols.length < 3 || !cols[textIdx]) continue;
            
            const type = cols[typeIdx] || 'mcq';
            const timer_seconds = parseInt(cols[timerIdx] || '30');
            const text = cols[textIdx] || '';
            const correct_answer = cols[correctIdx] || '';
            
            let options = null;
            if (type === 'mcq') {
               options = [
                 { label: 'A', text: cols[optAIdx] || 'Option A' },
                 { label: 'B', text: cols[optBIdx] || 'Option B' },
                 { label: 'C', text: cols[optCIdx] || 'Option C' },
                 { label: 'D', text: cols[optDIdx] || 'Option D' }
               ];
            } else if (type === 'truefalse') {
               options = [
                 { label: 'True', text: 'True' },
                 { label: 'False', text: 'False' }
               ];
            }
            
            importedQuestions.push({
              text,
              type,
              timer_seconds,
              correct_answer,
              options
            });
          }
        } else {
          throw new Error('Unsupported file format. Please upload a .json or .csv file');
        }
        
        const validated: any[] = [];
        for (let i = 0; i < importedQuestions.length; i++) {
          const q = importedQuestions[i];
          const rowNum = i + 1;
          
          if (!q.text || typeof q.text !== 'string' || !q.text.trim()) {
            throw new Error(`Question ${rowNum}: Question text is required`);
          }
          if (!['mcq', 'truefalse', 'identification'].includes(q.type)) {
            throw new Error(`Question ${rowNum}: Invalid type "${q.type}". Must be mcq, truefalse, or identification`);
          }
          if (isNaN(q.timer_seconds) || q.timer_seconds <= 0) {
            throw new Error(`Question ${rowNum}: timer_seconds must be a positive integer`);
          }
          if (!q.correct_answer || typeof q.correct_answer !== 'string' || !q.correct_answer.trim()) {
            throw new Error(`Question ${rowNum}: correct_answer is required`);
          }
          
          if (q.type === 'mcq') {
            if (!Array.isArray(q.options) || q.options.length !== 4) {
              throw new Error(`Question ${rowNum} (mcq): options must be an array of exactly 4 elements`);
            }
            const validLabels = q.options.map((o: any) => o.label);
            if (!validLabels.includes(q.correct_answer)) {
              throw new Error(`Question ${rowNum} (mcq): correct_answer must match one of the option labels (A, B, C, or D)`);
            }
          } else if (q.type === 'truefalse') {
            if (!['True', 'False'].includes(q.correct_answer)) {
              throw new Error(`Question ${rowNum} (truefalse): correct_answer must be either "True" or "False"`);
            }
          }
          
          validated.push({
            ...q,
            _dndId: Math.random().toString(36).substring(2, 11)
          });
        }
        
        setQuestions([...questions, ...validated]);
        if (validated.length > 0) {
          setActiveQuestionId(validated[0]._dndId);
        }
        alert(`Successfully imported ${validated.length} questions! Click "Save All Changes" to persist.`);
      } catch (err: any) {
        alert(`Import Failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
  const visibleOptions = activeQ?.type === 'truefalse'
    ? TRUE_FALSE_OPTIONS
    : (activeQ?.options || []);

  return (
    <div className="host-shell">
      <nav className="host-nav">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true"><span className="brand-dot" /><span className="brand-square" /><span className="brand-triangle" /></span><span>JPCS Quiz Game Host</span></div>
        <div className="bau-row"><Link to="/host" className="bau-button ghost">Dashboard</Link></div>
      </nav>

      <main className="host-main bau-stack">
        
        {/* Top Controls */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <select 
            value={selectedSetId} 
            onChange={e => setSelectedSetId(e.target.value)}
            className="bau-select"
          >
            <option value="">-- Select Question Set to Edit --</option>
            {questionSets.map(s => <option key={s.id} value={s.id}>{s.name || s.title}</option>)}
          </select>
          <button onClick={handleCreateSet} className="bau-button secondary">+ New Set</button>
          
          <div style={{ flex: 1 }}></div>
          {selectedSetId && (
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button onClick={handleExportJSON} className="bau-button secondary">Export JSON</button>
              <button onClick={handleExportCSV} className="bau-button secondary">Export CSV</button>
              <label className="bau-button secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', margin: 0 }}>
                Import File
                <input 
                  type="file" 
                  accept=".json,.csv" 
                  onChange={handleFileImport} 
                  style={{ display: 'none' }} 
                />
              </label>
              <button onClick={handleSaveQuestions} className="bau-button primary">Save All Changes</button>
            </div>
          )}
        </div>

        {/* Editor Grid */}
        {selectedSetId && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-xl)', flex: 1, alignItems: 'start' }}>
            
            {/* List Panel */}
            <div className="bau-card" style={{ height: '600px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h3>Questions ({questions.length})</h3>
                <button onClick={handleAddQuestion} className="bau-button secondary">+ Add</button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={questions.map(q => q._dndId)} strategy={verticalListSortingStrategy}>
                  {questions.map((q) => (
                    <SortableQuestionItem 
                      key={q._dndId} 
                      id={q._dndId} 
                      question={q} 
                      isActive={q._dndId === activeQuestionId}
                      onClick={() => setActiveQuestionId(q._dndId)}
                      onDelete={() => handleDeleteQuestion(q._dndId)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* Form Panel */}
            {activeQ ? (
              <div className="bau-card">
                <h3>Edit Question</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                  
                  <div>
                    <label className="text-muted">Question Text</label>
                    <textarea 
                      value={activeQ.text} 
                      onChange={e => updateActiveQuestion({ text: e.target.value })}
                      className="bau-textarea"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <div style={{ flex: 1 }}>
                      <label className="text-muted">Type</label>
                      <select 
                        value={activeQ.type} 
                        onChange={e => handleTypeChange(e.target.value)}
                        className="bau-input"
                      >
                        <option value="mcq">Multiple Choice</option>
                        <option value="truefalse">True / False</option>
                        <option value="identification">Identification</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="text-muted">Timer (Seconds)</label>
                      <input 
                        type="number" 
                        value={activeQ.timer_seconds} 
                        onChange={e => updateActiveQuestion({ timer_seconds: parseInt(e.target.value) })}
                        className="bau-input"
                      />
                    </div>
                  </div>

                  {/* Options editor based on type */}
                  {(activeQ.type === 'mcq' || activeQ.type === 'truefalse') && (
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      <label className="text-muted">Options</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                        {visibleOptions.map((opt: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="radio" 
                              name="correct_answer" 
                              checked={activeQ.correct_answer === opt.label}
                              onChange={() => updateActiveQuestion({ correct_answer: opt.label })}
                            />
                            <input 
                              type="text" 
                              value={opt.label} 
                              onChange={e => updateOption(i, 'label', e.target.value)} 
                              className="bau-input" style={{ width: 72 }} 
                              placeholder="Label" 
                              disabled={activeQ.type === 'truefalse'}
                            />
                            <input 
                              type="text" 
                              value={opt.text} 
                              onChange={e => updateOption(i, 'text', e.target.value)} 
                              className="bau-input" style={{ flex: 1 }} 
                              placeholder="Option Text" 
                              disabled={activeQ.type === 'truefalse'}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeQ.type === 'identification' && (
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      <label className="text-muted">Exact Correct Answer</label>
                      <input 
                        type="text" 
                        value={activeQ.correct_answer} 
                        onChange={e => updateActiveQuestion({ correct_answer: e.target.value })}
                        className="bau-input"
                      />
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="bau-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px' }}>
                <p className="text-muted">Select a question to edit.</p>
              </div>
            )}
            
          </div>
        )}
      </main>
    </div>
  );
}


