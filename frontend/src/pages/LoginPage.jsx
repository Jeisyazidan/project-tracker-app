import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const canvasRef = useRef(null);

  // Flow-field canvas animation (ported from original)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const color = '#818cf8';
    const particleCount = 600;
    let width, height, particles, animId;
    let mouse = { x: -9999, y: -9999 };

    class Particle {
      constructor() { this.reset(true); }
      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = 0; this.vy = 0; this.age = 0;
        this.life = Math.random() * 200 + 100;
      }
      update() {
        const angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;
        this.vx += Math.cos(angle) * 0.16;
        this.vy += Math.sin(angle) * 0.16;
        const dx = mouse.x - this.x, dy = mouse.y - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 150) { const f = (150 - dist) / 150; this.vx -= dx * f * 0.05; this.vy -= dy * f * 0.05; }
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.95; this.vy *= 0.95;
        this.age++;
        if (this.age > this.life) this.reset();
        if (this.x < 0) this.x = width; if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height; if (this.y > height) this.y = 0;
      }
      draw() {
        const alpha = 1 - Math.abs((this.age / this.life) - 0.5) * 2;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = color;
        ctx.fillRect(this.x, this.y, 1.5, 1.5);
      }
    }

    function init() {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth || window.innerWidth;
      height = canvas.offsetHeight || window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      particles = Array.from({ length: particleCount }, () => new Particle());
    }
    function animate() {
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(0, 0, width, height);
      particles.forEach(p => { p.update(); p.draw(); });
      animId = requestAnimationFrame(animate);
    }
    function onResize() { cancelAnimationFrame(animId); init(); animate(); }
    const onMove = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    init(); animate();
    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const handleLogin = async () => {
    if (!username || !password) { setError('Enter username and password.'); return; }
    setLoading(true); setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid username or password.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', background:'#000' }}>
      <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }} />
      <div style={{ position:'relative', zIndex:1, background:'rgba(255,255,255,0.07)', backdropFilter:'blur(18px)', WebkitBackdropFilter:'blur(18px)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:20, padding:'42px 38px', width:380, maxWidth:'95vw', boxShadow:'0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ textAlign:'center', marginBottom:30 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:4, letterSpacing:'-0.3px' }}>Project Tracker</h1>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Sign in to your account</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') document.getElementById('lp-pass')?.focus(); }}
              placeholder="Enter username"
              autoComplete="username"
              style={{ width:'100%', padding:'10px 13px', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,0.08)', color:'#fff', boxSizing:'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:5 }}>Password</label>
            <input
              id="lp-pass"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
              placeholder="Enter password"
              autoComplete="current-password"
              style={{ width:'100%', padding:'10px 13px', border:'1.5px solid rgba(255,255,255,0.2)', borderRadius:9, fontSize:13, fontFamily:'inherit', outline:'none', background:'rgba(255,255,255,0.08)', color:'#fff', boxSizing:'border-box' }}
            />
          </div>
          {error && (
            <div style={{ color:'#fca5a5', fontSize:12, background:'rgba(220,38,38,0.2)', border:'1px solid rgba(220,38,38,0.3)', padding:'8px 10px', borderRadius:7 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'white', border:'none', borderRadius:9, padding:12, fontSize:13, fontWeight:700, cursor:'pointer', marginTop:4, letterSpacing:'0.3px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
        <p style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:22 }}>Default: admin / admin123</p>
      </div>
    </div>
  );
}
