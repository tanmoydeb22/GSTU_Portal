import { useState, useCallback } from 'react';
import { Upload, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { bulkUploadStudents } from '../../api/staff.api';
import Button from '../../components/ui/Button';
import CredentialsModal from '../../components/ui/CredentialsModal';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

export default function BulkUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    Papa.parse(f, { header: true, skipEmptyLines: true, complete: (r) => setPreview(r.data.slice(0, 5)) });
  };

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]); }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await bulkUploadStudents(formData);
      setResult(res.data.data);
      toast.success(`Uploaded: ${res.data.data.inserted} students`);
      if (res.data.data.credentials?.length > 0) {
        setCredentialsModal(true);
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const downloadTemplate = () => {
    const csv = 'student_id,name,email,phone,batch,session,level,term,address\n2024CSE001,Md. Rahim,rahim@gmail.com,01700000001,2024,2024-25,1,1,Dhaka\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'student_template.csv'; a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900">Bulk Upload Students</h1>
        <Button variant="outline" onClick={downloadTemplate} className="w-full sm:w-auto justify-center"><Download className="h-4 w-4 mr-2" /> Download Template</Button>
      </div>

      {/* Drop zone */}
      <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragActive ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 bg-white'}`}
        onClick={() => document.getElementById('csv-input').click()}>
        <Upload className={`h-12 w-12 mx-auto mb-4 ${dragActive ? 'text-brand-500' : 'text-gray-300'}`} />
        <p className="font-medium text-gray-700">{file ? file.name : 'Drop CSV file here or click to browse'}</p>
        <p className="text-sm text-gray-400 mt-1">Only .csv files up to 5MB</p>
        <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="h-4 w-4" /> Preview (first 5 rows)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-brand-50"><tr>{Object.keys(preview[0]).map(k => <th key={k} className="px-3 py-2 text-left">{k}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j} className="px-3 py-2">{v}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          <Button onClick={handleUpload} loading={uploading} className="mt-4">Upload & Import</Button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-2 text-green-600"><CheckCircle className="h-5 w-5" /><span className="font-medium">{result.inserted} inserted</span></div>
            {result.failed > 0 && <div className="flex items-center gap-2 text-red-600"><AlertCircle className="h-5 w-5" /><span className="font-medium">{result.failed} failed</span></div>}
          </div>
          {result.errors?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700 max-h-40 overflow-y-auto">
              {result.errors.map((e, i) => <p key={i}>{e.student_id}: {e.error}</p>)}
            </div>
          )}
          {result.credentials?.length > 0 && (
            <Button onClick={() => setCredentialsModal(true)} className="mt-4" variant="outline">
              View Generated Passwords
            </Button>
          )}
        </div>
      )}

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={credentialsModal}
        onClose={() => setCredentialsModal(false)}
        credentials={result?.credentials}
        title="Student Login Credentials"
        message="Please securely share these temporary passwords with the students. For bulk operations, you can export them to CSV."
      />
    </div>
  );
}
