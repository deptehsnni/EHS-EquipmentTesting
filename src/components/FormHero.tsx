import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

interface FormHeroProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  stats?: Array<{ label: string; value: string; color?: string }>;
}

export const FormHero: React.FC<FormHeroProps> = ({ step, totalSteps, title, subtitle, stats }) => {
const user = { fullName: 'User' } as any; // Static - prevent re-renders
  const navigate = useNavigate();
  
  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div className="hero-section" style={{
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)',
      borderRadius: 'var(--r-2xl)', 
      padding: '32px 24px', 
      color: 'var(--on-primary)',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative blob */}
      <div style={{
        position: 'absolute',
        top: '-50px', right: '-50px',
        width: '200px', height: '200px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top: User greeting + back */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => navigate('/inventory')} 
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px', color: 'rgba(255,255,255,0.9)', cursor: 'pointer' }}
            >
              <span className="mi" style={{ fontSize: '18px' }}>arrow_back</span>
            </button>
            <div>
              <p style={{ fontSize: '11px', opacity: 0.9, marginBottom: '2px' }}>Halo, {user?.fullName?.split(' ')[0]}</p>
              <p style={{ fontSize: '12px', fontWeight: '500', opacity: 0.9 }}>EHS Inspector</p>
            </div>
          </div>
          
          {stats && (
            <div style={{ display: 'flex', gap: '12px' }}>
              {stats.map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', minWidth: '60px' }}>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: '800', 
                    lineHeight: '1', 
                    color: stat.color || 'var(--on-primary)'
                  }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ 
            fontFamily: 'Manrope', 
            fontSize: '28px', 
            fontWeight: '900', 
            lineHeight: '1.1',
            marginBottom: '6px',
            letterSpacing: '-0.02em'
          }}>
            {title}
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>{subtitle}</p>
        </div>

        {/* Progress */}
        <div style={{ 
          height: '4px', 
          background: 'rgba(255,255,255,0.2)', 
          borderRadius: '2px', 
          overflow: 'hidden',
          marginBottom: '4px'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${progress}%`, 
            background: 'rgba(255,255,255,0.4)',
            transition: 'width 0.3s ease',
            borderRadius: '2px'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.8 }}>
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
      </div>
    </div>
  );
};

