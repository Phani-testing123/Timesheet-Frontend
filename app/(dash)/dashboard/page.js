'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const PROFILE_KEY = 'ts_profile_v1';

function capitalizePreserveRest(word) {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildFilename(employeeName, weekEndDate) {
  let sanitized = employeeName.trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');

  sanitized = sanitized
    .split('_')
    .map(capitalizePreserveRest)
    .join('_');

  const suffix = 'Timesheet_Week_Ending';

  const dateStr = `${String(weekEndDate.getMonth() + 1).padStart(2, '0')}${String(weekEndDate.getDate()).padStart(2, '0')}${weekEndDate.getFullYear()}`;

  return `${sanitized}_${suffix}_${dateStr}.xlsx`;
}

const dateToYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const DEFAULT_DAYS = [
  { work_date: '', hours: 8 },
  { work_date: '', hours: 8 },
  { work_date: '', hours: 8 },
  { work_date: '', hours: 8 },
  { work_date: '', hours: 8 },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [form, setForm] = useState({
    employee_name: '',
    designation: '',
    email_primary: '',
    email_secondary: '',
    week_begin: '',
    week_end: '',
    days: DEFAULT_DAYS,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        setForm({
          employee_name: p.employee_name ?? '',
          designation: p.designation ?? '',
          email_primary: p.email_primary ?? '',
          email_secondary: p.email_secondary ?? '',
          week_begin: '',
          week_end: '',
          days: DEFAULT_DAYS,
        });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const toSave = {
        employee_name: form.employee_name,
        designation: form.designation,
        email_primary: form.email_primary,
        email_secondary: form.email_secondary,
        days: form.days,
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(toSave));
    } catch {}
  }, [form, hydrated]);

  const autofillFromBegin = (beginStr) => {
    if (!beginStr) return;
    const begin = new Date(beginStr);
    const newDays = [...Array(5)].map((_, i) => ({
      work_date: dateToYMD(addDays(begin, i)),
      hours: form.days[i]?.hours ?? 8,
    }));
    setForm((f) => ({
      ...f,
      week_begin: beginStr,
      week_end: dateToYMD(addDays(begin, 4)),
      days: newDays,
    }));
  };

  const autofillFromEnd = (endStr) => {
    if (!endStr) return;
    const end = new Date(endStr);
    const start = addDays(end, -4);
    const newDays = [...Array(5)].map((_, i) => ({
      work_date: dateToYMD(addDays(start, i)),
      hours: form.days[i]?.hours ?? 8,
    }));
    setForm((f) => ({
      ...f,
      week_begin: dateToYMD(start),
      week_end: endStr,
      days: newDays,
    }));
  };

  const submit = async () => {
    if (!form.employee_name || !form.designation || !form.email_primary) {
      alert('Please fill Employee Name, Role, and Primary Email.');
      return;
    }
    if (!form.week_begin || !form.week_end) {
      alert('Please select Week Begin and Week End.');
      return;
    }
    if (form.days.some((d) => !d.work_date)) {
      alert('Please auto-fill the 5 dates by picking Week Begin/End.');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      const res = await axios.post(
        `${apiUrl}/exports/weekly/download`,
        payload,
        { responseType: 'blob' }
      );

      const endDate = new Date(form.week_end);
      const filename = buildFilename(form.employee_name, endDate);

      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Export failed: ' + (e?.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 700, margin: '24px auto', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 8,
          boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)',
        }}
      >
        <h1 style={{ fontWeight: '700', marginBottom: 20 }}>Timesheet Export</h1>
        <p style={{ marginBottom: 24, color: '#555' }}>
          Enter your details, pick the week, adjust hours if needed, and export.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section>
            <h2 style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Employee Details</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {['employee_name', 'designation', 'email_primary', 'email_secondary'].map((field) => (
                <div key={field} style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column' }}>
                  <label htmlFor={field} style={{ marginBottom: 6, fontWeight: 500, color: '#333' }}>
                    {field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </label>
                  <input
                    id={field}
                    type={field.includes('email') ? 'email' : 'text'}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 4,
                      border: '1px solid #ccc',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Week Selection</h2>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="week_begin" style={{ marginBottom: 6, fontWeight: 500, color: '#333' }}>
                  Week Begin
                </label>
                <input
                  id="week_begin"
                  type="date"
                  value={form.week_begin}
                  onChange={(e) => autofillFromBegin(e.target.value)}
                  style={{ padding: 10, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="week_end" style={{ marginBottom: 6, fontWeight: 500, color: '#333' }}>
                  Week End
                </label>
                <input
                  id="week_end"
                  type="date"
                  value={form.week_end}
                  onChange={(e) => autofillFromEnd(e.target.value)}
                  style={{ padding: 10, borderRadius: 4, border: '1px solid #ccc' }}
                />
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 18, fontWeight: '600', marginBottom: 10 }}>Daily Hours</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {form.days.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="date"
                    value={d.work_date}
                    onChange={(e) => {
                      const days = [...form.days];
                      days[i].work_date = e.target.value;
                      setForm({ ...form, days });
                    }}
                    style={{ flex: 1, padding: 10, borderRadius: 4, border: '1px solid #ccc' }}
                  />
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={d.hours}
                    onChange={(e) => {
                      const days = [...form.days];
                      days[i].hours = Number(e.target.value);
                      setForm({ ...form, days });
                    }}
                    style={{ width: 80, padding: 10, borderRadius: 4, border: '1px solid #ccc', textAlign: 'center' }}
                  />
                </div>
              ))}
            </div>
          </section>

          <button
            onClick={submit}
            disabled={loading}
            style={{
              backgroundColor: '#0078d4',
              color: '#fff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: 6,
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: 20,
            }}
          >
            {loading ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>
    </main>
  );
}
