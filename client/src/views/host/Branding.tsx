import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { apiPath } from '../../config/api';

export default function Branding() {
  const { isHostAuthenticated } = useSocket();
  const navigate = useNavigate();

  const [id, setId] = useState('');
  const [eventName, setEventName] = useState('Quiz Bee Event');
  const [primaryColor, setPrimaryColor] = useState('#8b5cf6');
  const [accentColor, setAccentColor] = useState('#d946ef');
  const [logoUrl, setLogoUrl] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isHostAuthenticated) {
      navigate('/host/login');
      return;
    }
    
    // Fetch existing branding
    fetch(apiPath('/api/branding'))
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setId(data.id);
          setEventName(data.event_name || '');
          setPrimaryColor(data.primary_color_hex || '#8b5cf6');
          setAccentColor(data.accent_color_hex || '#d946ef');
          setLogoUrl(data.logo_url || '');
        }
      })
      .catch(err => console.error('Failed to load branding:', err));
  }, [isHostAuthenticated, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    let currentLogoUrl = logoUrl;

    // 1. Upload Logo if a new file is selected
    if (selectedFile) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('logo', selectedFile);

      try {
        const uploadRes = await fetch(apiPath('/api/branding/logo'), {
          method: 'POST',
          body: formData
        });
        
        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();
        currentLogoUrl = uploadData.url;
        setLogoUrl(currentLogoUrl);
        setSelectedFile(null); // Clear file input
      } catch (err: any) {
        alert(err.message);
        setIsUploading(false);
        setIsSaving(false);
        return;
      }
      setIsUploading(false);
    }

    // 2. Save Branding Data
    try {
      const res = await fetch(apiPath('/api/branding'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id || undefined,
          event_name: eventName,
          primary_color_hex: primaryColor,
          accent_color_hex: accentColor,
          logo_url: currentLogoUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        setId(data.id);
        alert('Branding saved successfully!');
      } else {
        alert('Failed to save branding.');
      }
    } catch (err: any) {
      alert('Error saving branding: ' + err.message);
    }
    
    setIsSaving(false);
  };

  if (!isHostAuthenticated) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ background: 'var(--bg-secondary)', padding: 'var(--space-md) var(--space-xl)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h2>Quiz Bee Host</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <Link to="/host" style={navLink}>Dashboard</Link>
          <Link to="/host/editor" style={navLink}>Editor</Link>
        </div>
      </nav>

      <div className="container" style={{ padding: 'var(--space-xl) var(--space-md)', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '600px' }}>
          <h2>Branding Configuration</h2>
          <p className="text-muted" style={{ marginBottom: 'var(--space-xl)' }}>Configure the look and feel for the big screen and participant devices.</p>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            
            <div>
              <label style={labelStyle}>Event Name</label>
              <input 
                type="text" 
                value={eventName} 
                onChange={(e) => setEventName(e.target.value)} 
                style={inputStyle} 
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <div>
                <label style={labelStyle}>Primary Color (Hex)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    style={{ width: '40px', height: '40px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Accent Color (Hex)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="color" 
                    value={accentColor} 
                    onChange={(e) => setAccentColor(e.target.value)} 
                    style={{ width: '40px', height: '40px', border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <input 
                    type="text" 
                    value={accentColor} 
                    onChange={(e) => setAccentColor(e.target.value)} 
                    style={inputStyle} 
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 'var(--space-md)' }}>
              <label style={labelStyle}>Event Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: '8px' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {logoUrl ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span className="text-muted text-sm">No Logo</span>}
                </div>
                <div>
                  <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} />
                  <p className="text-muted text-sm" style={{ marginTop: '8px' }}>Recommended: PNG or SVG with transparent background.</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-md)' }}>
              <button type="submit" style={{ ...primaryBtn, width: '100%', padding: 'var(--space-md)' }} disabled={isSaving || isUploading}>
                {isUploading ? 'Uploading Logo...' : isSaving ? 'Saving...' : 'Save Branding Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', marginTop: '4px' };
const labelStyle: React.CSSProperties = { display: 'block', color: 'var(--text-secondary)', fontWeight: 'bold' };
const primaryBtn: React.CSSProperties = { background: 'var(--color-primary)', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' };
const navLink: React.CSSProperties = { color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 'bold', padding: '0 var(--space-sm)' };
