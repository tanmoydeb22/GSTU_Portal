import Modal from './Modal';
import Button from './Button';
import { Copy, Check, Download, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function CredentialsModal({ isOpen, onClose, credentials, title = "Login Credentials", message = "Please share these credentials securely. For security, passwords are only shown once." }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!isOpen || !credentials) return null;

  const isArray = Array.isArray(credentials);
  const credsList = isArray ? credentials : [credentials];

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Identifier,Name,Email,Temporary Password\n" 
      + credsList.map(c => `${c.student_id || c.staff_code || c.admin_code || c.teacher_code || c.email},${c.name || ''},${c.email || ''},${c.temp_password}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "credentials.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-amber-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{message}</p>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-3">
          {credsList.map((cred, idx) => {
            const identifier = cred.student_id || cred.staff_code || cred.admin_code || cred.teacher_code || cred.email;
            const textToCopy = `ID: ${identifier}\nPassword: ${cred.temp_password}`;
            
            return (
              <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500 font-medium">{cred.name || 'User'}</div>
                  <div className="text-sm font-semibold text-gray-900">{identifier}</div>
                  <div className="text-sm font-mono text-brand-600 mt-1">{cred.temp_password}</div>
                </div>
                <button 
                  onClick={() => handleCopy(textToCopy, idx)}
                  className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                  title="Copy Credentials"
                >
                  {copiedIndex === idx ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
          {isArray && (
            <Button variant="secondary" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          )}
          <Button onClick={onClose}>I have saved these securely</Button>
        </div>
      </div>
    </Modal>
  );
}
