import { useState, useEffect } from 'react';
import { Mail, ArrowLeft, Phone, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { getPhoneForResetApi, resetPasswordWithOtpApi, forgotPasswordApi } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const roles = ['teacher', 'student'];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: ID, 2: OTP, 3: Reset
  const [selectedRole, setSelectedRole] = useState('student');
  const [resetMethod, setResetMethod] = useState('phone'); // 'phone' or 'email'
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [phoneData, setPhoneData] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [idToken, setIdToken] = useState(null);

  const handleEmailReset = async (e) => {
    e.preventDefault();
    if (!identifier) return toast.error('Please enter your ID/Email');
    
    setLoading(true);
    try {
      await forgotPasswordApi(identifier, selectedRole);
      toast.success('Reset link sent to your registered email!');
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to send reset email';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cleanup recaptcha on unmount
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, []);

  const setupRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        const element = document.getElementById('recaptcha-container');
        if (element) element.innerHTML = '';
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { console.log('reCAPTCHA resolved'); },
        'expired-callback': () => { 
          toast.error('reCAPTCHA expired. Please try again.');
          setupRecaptcha();
        }
      });
    } catch (error) {
      console.error("reCAPTCHA Error:", error);
      toast.error("Failed to initialize security check.");
    }
  };

  const handleFetchPhone = async (e) => {
    e.preventDefault();
    if (resetMethod === 'email') return handleEmailReset(e);
    if (!identifier) return toast.error('Please enter your ID');
    
    setLoading(true);
    try {
      const res = await getPhoneForResetApi(identifier, selectedRole);
      setPhoneData(res.data.data);
      setStep(1.5); // New intermediate step
      toast.success('Phone number found!');
    } catch (err) {
      console.error('Fetch Phone Error:', err.response?.data || err);
      toast.error(err.response?.data?.error || 'User not found or phone not registered');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phoneData.phone, appVerifier);
      
      setConfirmationResult(result);
      setStep(2);
      toast.success('OTP sent to your phone!');
    } catch (err) {
      console.error('Send OTP Error:', err);
      const errorCode = err.code || 'unknown';
      toast.error(`SMS Failed (${errorCode}). Check Firebase Console or use Email method.`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');
    
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const token = await result.user.getIdToken();
      setIdToken(token);
      setStep(3);
      toast.success('Phone verified!');
    } catch (err) {
      toast.error('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await resetPasswordWithOtpApi(identifier, selectedRole, idToken, newPassword);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/85 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl overflow-hidden animate-fade-in w-full max-w-md mx-auto p-5 md:p-6">
      <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:text-brand-900 mb-3 transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
      </Link>
      
      <div className="mb-4">
        <h2 className="text-xl md:text-2xl font-display font-extrabold text-gray-900 tracking-tight">Reset Password</h2>
        <p className="text-xs text-gray-600 mt-0.5 font-medium">
          {step === 1 && "Enter your ID to receive a verification code."}
          {step === 2 && `Enter the 6-digit code sent to ${phoneData?.maskedPhone}`}
          {step === 3 && "Verified! Please choose a strong new password."}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-5">
        {resetMethod === 'phone' ? (
          [1, 2, 3].map((s) => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
              <div className={`h-full transition-all duration-500 ${step >= s ? 'bg-brand-600' : 'bg-transparent'}`} />
            </div>
          ))
        ) : (
          <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
            <div className={`h-full transition-all duration-500 ${step >= 1 ? 'bg-brand-600' : 'bg-transparent'}`} />
          </div>
        )}
      </div>

      {step === 1.5 && (
        <div className="space-y-4">
          <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100">
            <p className="text-xs text-brand-800 mb-3 font-medium text-center">We found a phone number linked to your account:</p>
            <div className="flex items-center justify-center gap-2 bg-white/60 p-3 rounded-xl shadow-sm border border-brand-100">
              <Phone className="h-4 w-4 text-brand-600" />
              <span className="text-lg font-bold text-gray-900 tracking-wider">{phoneData?.maskedPhone}</span>
            </div>
            <p className="text-[10px] text-brand-400 mt-3 text-center italic">If this is not your number, please contact your department office.</p>
          </div>

          <div id="recaptcha-container" className="flex justify-center my-2"></div>

          <div className="space-y-2.5">
            <Button onClick={handleSendOTP} loading={loading} className="w-full shadow-lg" size="lg">
              <Mail className="h-4 w-4 mr-2" /> Send Code
            </Button>
            <button 
              type="button" 
              onClick={() => setStep(1)} 
              className="w-full py-1.5 text-xs font-bold text-gray-500 hover:text-brand-700 transition-colors"
            >
              Back to ID search
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleFetchPhone} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 tracking-wide uppercase">I am a...</label>
            <div className="flex gap-2">
              {roles.map(r => (
                <button key={r} type="button" onClick={() => setSelectedRole(r)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all duration-200 ${selectedRole === r ? 'bg-white text-brand-700 border-white shadow-sm ring-1 ring-black/5' : 'border-transparent text-gray-600 hover:bg-white/50'}`}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex p-1 bg-gray-400/10 rounded-xl mb-3">
            <button
              type="button"
              onClick={() => setResetMethod('phone')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${
                resetMethod === 'phone'
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <Phone className="h-3 w-3" /> Phone OTP
            </button>
            <button
              type="button"
              onClick={() => setResetMethod('email')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${
                resetMethod === 'email'
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-black/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <Mail className="h-3 w-3" /> Email Link
            </button>
          </div>

          <Input 
            label={selectedRole === 'student' ? 'Student ID' : 'Teacher Code/Email'} 
            icon={selectedRole === 'student' ? ShieldCheck : Mail} 
            placeholder={selectedRole === 'student' ? 'e.g. 21CSE001' : 'e.g. T-101'} 
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            required
          />

          <Button type="submit" loading={loading} className="w-full shadow-lg" size="lg">
            {resetMethod === 'phone' ? 'Verify Identity' : 'Send Link'}
          </Button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="bg-brand-50/50 p-3 rounded-xl border border-brand-100 flex items-center gap-2">
            <Phone className="h-4 w-4 text-brand-600" />
            <p className="text-xs text-brand-900">OTP sent to <strong>{phoneData?.maskedPhone}</strong></p>
          </div>

          <Input 
            label="6-Digit OTP" 
            placeholder="000000" 
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            className="text-center text-xl tracking-[0.5em] font-mono"
            required
          />

          <Button type="submit" loading={loading} className="w-full shadow-lg" size="lg">
            Verify
          </Button>
          
          <button type="button" onClick={() => setStep(1)} className="w-full text-xs font-bold text-gray-500 hover:text-brand-700 text-center">
            Wrong ID? Go back
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="bg-green-50/50 p-3 rounded-xl border border-green-100 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-xs text-green-900 font-medium">Verified successfully.</p>
          </div>

          <Input 
            label="New Password" 
            type="password" 
            icon={KeyRound}
            placeholder="Min 8 characters"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />

          <Input 
            label="Confirm Password" 
            type="password" 
            icon={KeyRound}
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" loading={loading} className="w-full shadow-lg" size="lg">
            Reset Password
          </Button>
        </form>
      )}
    </div>
  );
}
