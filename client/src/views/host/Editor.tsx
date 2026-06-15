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
    backgroundColor: isActive ? 'var(--color-primary-dark)' : 'var(--bg-card)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }} {...attributes} {...listeners}>
        <span style={{ cursor: 'grab', color: 'var(--text-muted)' }}>☰</span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
          {question.text || 'New Question'}
        </span>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }} 
        style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '1.2rem' }}
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
      .then(data => setQuestionSets(data))
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: 'var(--bg-secondary)', padding: 'var(--space-md) var(--space-xl)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2>Quiz Bee Host</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <Link to="/host" style={navLink}>Dashboard</Link>
          <Link to="/host/branding" style={navLink}>Branding</Link>
        </div>
      </nav>

      <div className="container" style={{ padding: 'var(--space-xl) var(--space-md)', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        
        {/* Top Controls */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
          <select 
            value={selectedSetId} 
            onChange={e => setSelectedSetId(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- Select Question Set to Edit --</option>
            {questionSets.map(s => <option key={s.id} value={s.id}>{s.name || s.title}</option>)}
          </select>
          <button onClick={handleCreateSet} style={secondaryBtn}>+ New Set</button>
          
          <div style={{ flex: 1 }}></div>
          {selectedSetId && <button onClick={handleSaveQuestions} style={primaryBtn}>Save All Changes</button>}
        </div>

        {/* Editor Grid */}
        {selectedSetId && (
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 'var(--space-xl)', flex: 1, alignItems: 'start' }}>
            
            {/* List Panel */}
            <div className="glass-card" style={{ height: '600px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h3>Questions ({questions.length})</h3>
                <button onClick={handleAddQuestion} style={secondaryBtn}>+ Add</button>
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
              <div className="glass-card">
                <h3>Edit Question</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
                  
                  <div>
                    <label className="text-muted">Question Text</label>
                    <textarea 
                      value={activeQ.text} 
                      onChange={e => updateActiveQuestion({ text: e.target.value })}
                      style={{ ...inputStyle, width: '100%', height: '80px', marginTop: '4px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <div style={{ flex: 1 }}>
                      <label className="text-muted">Type</label>
                      <select 
                        value={activeQ.type} 
                        onChange={e => handleTypeChange(e.target.value)}
                        style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
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
                        style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
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
                              style={{ ...inputStyle, width: '60px' }} 
                              placeholder="Label" 
                              disabled={activeQ.type === 'truefalse'}
                            />
                            <input 
                              type="text" 
                              value={opt.text} 
                              onChange={e => updateOption(i, 'text', e.target.value)} 
                              style={{ ...inputStyle, flex: 1 }} 
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
                        style={{ ...inputStyle, width: '100%', marginTop: '4px' }}
                      />
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '600px' }}>
                <p className="text-muted">Select a question to edit.</p>
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white' };
const primaryBtn: React.CSSProperties = { background: 'var(--color-primary)', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' };
const secondaryBtn: React.CSSProperties = { background: 'var(--bg-secondary)', color: 'white', padding: '8px 16px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' };
const navLink: React.CSSProperties = { color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold', padding: '0 var(--space-sm)' };
