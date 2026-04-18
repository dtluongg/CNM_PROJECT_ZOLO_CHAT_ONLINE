import React, { useState, useRef, useEffect } from 'react';
import { X, AlarmClock, Calendar, Clock } from 'lucide-react';

const Wheel = ({ items, value, onChange, labelPath = null, width = 'w-24', isOpen, isItemDisabled }) => {
  const scrollRef = useRef(null);
  const itemHeight = 44;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollTop / itemHeight);
    if (items[index]) {
      const val = labelPath ? items[index][labelPath] : items[index];
      
      // If selected item is disabled, snap back to nearest valid item
      if (isItemDisabled && isItemDisabled(val)) {
        // Find nearest valid index
        let validIdx = -1;
        // Search forward
        for (let j = index; j < items.length; j++) {
          const v = labelPath ? items[j][labelPath] : items[j];
          if (!isItemDisabled(v)) { validIdx = j; break; }
        }
        // Search backward if not found
        if (validIdx === -1) {
          for (let j = index; j >= 0; j--) {
            const v = labelPath ? items[j][labelPath] : items[j];
            if (!isItemDisabled(v)) { validIdx = j; break; }
          }
        }
        
        if (validIdx !== -1) {
          scrollRef.current.scrollTo({ top: validIdx * itemHeight, behavior: 'smooth' });
          return;
        }
      }

      if (val !== value) onChange(val);
    }
  };

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      const index = items.findIndex(item => (labelPath ? item[labelPath] : item) === value);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    }
  }, [value, items, isOpen]);

  return (
    <div className={`relative h-44 ${width} overflow-hidden group z-20`}>
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide py-[66px] relative z-20"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, i) => {
          const val = labelPath ? item[labelPath] : item;
          const label = labelPath ? item.label : item;
          const isActive = val === value;
          const disabled = isItemDisabled?.(val);

          return (
            <div 
              key={i}
              onClick={() => {
                if (disabled) return;
                onChange(val);
                if (scrollRef.current) scrollRef.current.scrollTop = i * itemHeight;
              }}
              className={`h-11 flex items-center justify-center snap-center transition-all duration-300 ${
                disabled 
                  ? 'opacity-10 cursor-not-allowed scale-90' 
                  : 'cursor-pointer'
              } ${
                isActive && !disabled
                  ? 'text-[var(--text-primary)] font-bold text-xl scale-110' 
                  : 'text-[var(--text-primary)] text-sm font-semibold opacity-70 hover:opacity-100'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
      
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[var(--bg-secondary)] via-[var(--bg-secondary)]/90 to-transparent pointer-events-none z-30" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg-secondary)] via-[var(--bg-secondary)]/90 to-transparent pointer-events-none z-30" />
    </div>
  );
};

export default function CreateReminderModal({ isOpen, onClose, onCreate, isGroup }) {
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [showPickerMode, setShowPickerMode] = useState(null); // 'date', 'time', or null

  const currentD = new Date(date);
  const [selectedDay, setSelectedDay] = useState(currentD.getDate().toString().padStart(2, '0'));
  const [selectedMonth, setSelectedMonth] = useState((currentD.getMonth() + 1).toString().padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(currentD.getFullYear().toString());
  const [selectedHour, setSelectedHour] = useState(time.split(':')[0]);
  const [selectedMinute, setSelectedMinute] = useState(time.split(':')[1]);

  // Auto-validate and snap to current date/time if selection becomes invalid
  useEffect(() => {
    if (!isOpen) return;

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentDay = new Date().getDate();
    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();

    // Check Year/Month
    if (parseInt(selectedYear) === currentYear && parseInt(selectedMonth) < currentMonth) {
      setSelectedMonth(currentMonth.toString().padStart(2, '0'));
    }

    // Check Day
    if (parseInt(selectedYear) === currentYear && parseInt(selectedMonth) === currentMonth && parseInt(selectedDay) < currentDay) {
      setSelectedDay(currentDay.toString().padStart(2, '0'));
    }
    
    // Check Hour/Minute for today
    const selDateStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, parseInt(selectedDay)).getTime();
    const todayStart = new Date(currentYear, currentMonth - 1, currentDay).getTime();

    if (selDateStart === todayStart) {
      if (parseInt(selectedHour) < currentHour) {
        setSelectedHour(currentHour.toString().padStart(2, '0'));
      }
      if (parseInt(selectedHour) === currentHour && parseInt(selectedMinute) < currentMin) {
        setSelectedMinute(currentMin.toString().padStart(2, '0'));
      }
    }
  }, [selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const d = new Date(date);
      setSelectedDay(d.getDate().toString().padStart(2, '0'));
      setSelectedMonth((d.getMonth() + 1).toString().padStart(2, '0'));
      setSelectedYear(d.getFullYear().toString());
      const parts = time.split(':');
      setSelectedHour(parts[0]);
      setSelectedMinute(parts[1]);
    }
  }, [isOpen, date, time]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!content.trim()) return;
    
    const reminderTimeStr = `${date}T${time}:00`;
    const selectedTime = new Date(reminderTimeStr);
    
    if (selectedTime <= new Date()) {
      alert('Vui lòng chọn thời gian nhắc hẹn ở tương lai');
      return;
    }

    onCreate({
      content: content.trim(),
      reminderTime: selectedTime.toISOString()
    });
    setContent('');
    onClose();
  };

  const handleTrayDone = () => {
    if (showPickerMode === 'date') {
      setDate(`${selectedYear}-${selectedMonth}-${selectedDay}`);
    } else {
      setTime(`${selectedHour}:${selectedMinute}`);
    }
    setShowPickerMode(null);
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const isMonthDisabled = (m) => {
    if (parseInt(selectedYear) < currentYear) return true;
    if (parseInt(selectedYear) === currentYear) return parseInt(m) < currentMonth;
    return false;
  };

  const isDayDisabled = (d) => {
    if (parseInt(selectedYear) < currentYear) return true;
    if (parseInt(selectedYear) === currentYear) {
      if (parseInt(selectedMonth) < currentMonth) return true;
      if (parseInt(selectedMonth) === currentMonth) return parseInt(d) < currentDay;
    }
    return false;
  };

  const isHourDisabled = (h) => {
    const selDate = new Date(`${selectedYear}-${selectedMonth}-${selectedDay}`);
    const today = new Date(currentYear, currentMonth - 1, currentDay);
    if (selDate < today) return true;
    if (selDate.getTime() === today.getTime()) return parseInt(h) < currentHour;
    return false;
  };

  const isMinuteDisabled = (m) => {
    const selDate = new Date(`${selectedYear}-${selectedMonth}-${selectedDay}`);
    const today = new Date(currentYear, currentMonth - 1, currentDay);
    if (selDate < today) return true;
    if (selDate.getTime() === today.getTime() && parseInt(selectedHour) === currentHour) return parseInt(m) < currentMinute;
    return false;
  };

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const months = [
    { label: 'Jan', value: '01' }, { label: 'Feb', value: '02' }, { label: 'Mar', value: '03' },
    { label: 'Apr', value: '04' }, { label: 'May', value: '05' }, { label: 'Jun', value: '06' },
    { label: 'Jul', value: '07' }, { label: 'Aug', value: '08' }, { label: 'Sep', value: '09' },
    { label: 'Oct', value: '10' }, { label: 'Nov', value: '11' }, { label: 'Dec', value: '12' }
  ];
  const years = Array.from({ length: 15 }, (_, i) => (new Date().getFullYear() + i).toString());
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 animate-in fade-in duration-300">
      <style>{`
        input::-webkit-calendar-picker-indicator,
        input::-webkit-time-picker-indicator {
          display: none !important;
          -webkit-appearance: none;
        }
        .picker-tray {
          transform: translateY(100%);
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          background: var(--bg-secondary);
          border-top: 1px solid var(--border);
        }
        .picker-tray.active {
          transform: translateY(0);
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Main Modal Container (Solid var(--bg-secondary)) */}
      <div className="relative w-[440px] rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-[0_32px_64px_rgba(0,0,0,0.6)] animate-in modalIn duration-300 overflow-hidden">
        
        {/* Main Content Area - STATIC PERFORMANCE (No blur, scale or opacity change) */}
        <div className={`transition-all duration-300 p-6 ${showPickerMode ? 'pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                <AlarmClock size={20} />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Tạo nhắc hẹn</h2>
            </div>
            <button onClick={onClose} className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all">
              <X size={24} />
            </button>
          </div>

          <div className="max-h-[min(65vh,500px)] overflow-y-auto scrollbar-hide pr-1 space-y-6">
            <div className="flex flex-col">
              <div className="mb-3 px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Nội dung</label>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập nội dung cần nhắc hẹn..."
                className="w-full min-h-[120px] rounded-2xl bg-black/10 p-4 text-sm text-[var(--text-primary)] border border-[var(--border)] focus:border-[var(--accent)]/50 focus:bg-black/20 transition-all outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div onClick={() => setShowPickerMode('date')} className="group flex flex-col cursor-pointer">
                <div className="mb-3 px-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">Ngày</label>
                </div>
                <div className="flex items-center gap-3 w-full rounded-xl bg-black/10 py-3.5 px-4 text-sm text-[var(--text-primary)] border border-[var(--border)] group-hover:border-[var(--accent)]/40 transition-all">
                  <Calendar size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
                  <span className="font-semibold tracking-tight uppercase text-xs">{date}</span>
                </div>
              </div>
              <div onClick={() => setShowPickerMode('time')} className="group flex flex-col cursor-pointer">
                <div className="mb-3 px-1">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">Giờ</label>
                </div>
                <div className="flex items-center gap-3 w-full rounded-xl bg-black/10 py-3.5 px-4 text-sm text-[var(--text-primary)] border border-[var(--border)] group-hover:border-[var(--accent)]/40 transition-all">
                  <Clock size={16} className="text-[var(--text-muted)] group-hover:text-[var(--accent)]" />
                  <span className="font-semibold tracking-tight text-xs">{time}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 p-4">
              <p className="text-[11px] text-[var(--accent)] font-bold leading-relaxed opacity-80 italic">
                * {isGroup 
                    ? 'Hệ thống sẽ thông báo cho mọi người trong nhóm khi đến thời điểm này.' 
                    : 'Hệ thống sẽ gửi thông báo nhắc hẹn cho cả hai người khi đến thời điểm này.'}
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-2xl bg-black/10 px-6 py-4 text-sm font-bold text-[var(--text-primary)] hover:bg-black/20 transition-all active:scale-95 border border-[var(--border)]"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleCreate}
              disabled={!content.trim()}
              className={`flex-1 rounded-2xl px-6 py-4 text-sm font-bold text-white transition-all ${
                content.trim() 
                  ? 'bg-[var(--accent)] hover:brightness-110 shadow-[0_8px_24px_rgba(var(--accent-rgb),0.3)] active:scale-95' 
                  : 'bg-[var(--accent)]/20 text-white/40 cursor-not-allowed'
              }`}
            >
              Tạo nhắc hẹn
            </button>
          </div>
        </div>

        {/* PIRE SELECTION TRAY (Overlaying only the bottom portion, Unaffected Background) */}
        <div className={`absolute bottom-0 left-0 right-0 bg-[var(--bg-secondary)] rounded-t-[2.5rem] shadow-[0_-20px_48px_rgba(0,0,0,0.5)] z-[100] picker-tray border-t border-[var(--border)] ${showPickerMode ? 'active' : ''}`}>
          <div className="flex items-center justify-between h-16 px-10 border-b border-[var(--border)]">
            <span className="text-[var(--text-primary)] font-black text-[10px] uppercase tracking-[0.25em]">
              {showPickerMode === 'date' ? 'Chọn ngày' : 'Chọn giờ'}
            </span>
            <button 
              onClick={handleTrayDone}
              className="text-[var(--accent)] font-bold text-sm tracking-tight hover:brightness-125 transition-all"
            >
              Xong
            </button>
          </div>
          
          <div className="flex justify-center items-center h-[260px] relative px-6 overflow-hidden">
            {/* Selection Highlight Pill */}
            <div className="absolute top-1/2 left-4 right-4 h-11 -translate-y-1/2 bg-[var(--bg-hover)] border-[var(--border)] border-y pointer-events-none z-10" />
            
            <div className="flex items-center justify-center gap-1 relative z-20">
              {showPickerMode === 'date' ? (
                <>
                  <Wheel 
                    items={days} 
                    value={selectedDay} 
                    onChange={setSelectedDay} 
                    width="w-20" 
                    isOpen={isOpen} 
                    isItemDisabled={isDayDisabled}
                  />
                  <Wheel 
                    items={months} 
                    value={selectedMonth} 
                    onChange={setSelectedMonth} 
                    labelPath="value" 
                    width="w-24" 
                    isOpen={isOpen} 
                    isItemDisabled={isMonthDisabled}
                  />
                  <Wheel 
                    items={years} 
                    value={selectedYear} 
                    onChange={setSelectedYear} 
                    width="w-28" 
                    isOpen={isOpen} 
                  />
                </>
              ) : (
                <>
                  <Wheel 
                    items={hours} 
                    value={selectedHour} 
                    onChange={setSelectedHour} 
                    width="w-24" 
                    isOpen={isOpen} 
                    isItemDisabled={isHourDisabled}
                  />
                  <span className="text-[var(--text-primary)] text-3xl font-light mb-2 mx-1">:</span>
                  <Wheel 
                    items={minutes} 
                    value={selectedMinute} 
                    onChange={setSelectedMinute} 
                    width="w-24" 
                    isOpen={isOpen} 
                    isItemDisabled={isMinuteDisabled}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
