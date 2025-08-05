import React, { useState } from 'react';
import { useEffect } from 'react';
import { Mic, List, CheckCircle, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { supabase, RecordingLog, User, isAdmin } from './lib/supabase';
import { AudioRecorder } from './components/AudioRecorder';
import { RecordingsList } from './components/RecordingsList';
import { AuthComponent } from './components/AuthComponent';
import { UserProfile } from './components/UserProfile';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'record' | 'list'>('record');
  const [candidateName, setCandidateName] = useState('');
  const [questionLabel, setQuestionLabel] = useState('');
  const [questionPosition, setQuestionPosition] = useState<number>(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user as User || null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as User || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!candidateName.trim()) {
      setUploadError('Please enter candidate name');
      return;
    }
    
    if (!questionLabel.trim()) {
      setUploadError('Please enter question label');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccess(false);

    try {
      // Generate unique filename
      const fileId = uuidv4();
      const fileName = `${fileId}.wav`;
      const filePath = `recordings/${candidateName.trim()}/${fileName}`;

      // Convert webm to wav-like blob for better compatibility
      const wavBlob = new Blob([audioBlob], { type: 'audio/wav' });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(filePath, wavBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(filePath);

      // Save metadata to database
      const recordingData: RecordingLog = {
        candidate_name: candidateName.trim(),
        question_label: questionLabel.trim(),
        question_position: questionPosition,
        user_id: user?.id,
        file_url: publicUrl,
      };

      const { error: dbError } = await supabase
        .from('recording_logs')
        .insert([recordingData]);

      if (dbError) throw dbError;

      setUploadSuccess(true);
      setCandidateName('');
      setQuestionLabel('');
      setQuestionPosition(1);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload recording');
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthComponent />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Voice Interview Tool</h1>
              <p className="text-gray-600 mt-1">
                Record and manage interview responses
                {isAdmin(user) && <span className="ml-2 text-purple-600 font-medium">(Admin View - All Recordings)</span>}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <nav className="flex gap-2">
                <button
                  onClick={() => setCurrentView('record')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'record'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  Record
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentView === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <List className="w-4 h-4" />
                  {isAdmin(user) ? 'All Recordings' : 'My Recordings'}
                </button>
              </nav>
              
              <UserProfile user={user} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {currentView === 'record' ? (
          <div className="space-y-6">
            {/* Recording Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                New Interview Recording
              </h2>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-2">
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    id="candidateName"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Enter candidate's full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="questionLabel" className="block text-sm font-medium text-gray-700 mb-2">
                    Question Label *
                  </label>
                  <input
                    type="text"
                    id="questionLabel"
                    value={questionLabel}
                    onChange={(e) => setQuestionLabel(e.target.value)}
                    placeholder="e.g., Rate Negotiation, Technical Skills"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="questionPosition" className="block text-sm font-medium text-gray-700 mb-2">
                    Question Position
                  </label>
                  <input
                    type="number"
                    id="questionPosition"
                    value={questionPosition}
                    onChange={(e) => setQuestionPosition(parseInt(e.target.value) || 1)}
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Status Messages */}
              {uploadSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  Recording uploaded successfully!
                </div>
              )}
              
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Audio Recorder */}
            <AudioRecorder 
              onRecordingComplete={handleRecordingComplete}
              isUploading={isUploading}
            />
          </div>
        ) : (
          <RecordingsList user={user} />
        )}
      </main>
    </div>
  );
}

export default App;
              <button
                onClick={() => setCurrentView('record')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'record'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Mic className="w-4 h-4" />
                Record
              </button>
              <button
                onClick={() => setCurrentView('list')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <List className="w-4 h-4" />
                All Recordings
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {currentView === 'record' ? (
          <div className="space-y-6">
            {/* Recording Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                New Interview Recording
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700 mb-2">
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    id="candidateName"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Enter candidate's full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                
                <div>
                  <label htmlFor="questionLabel" className="block text-sm font-medium text-gray-700 mb-2">
                    Question Label *
                  </label>
                  <input
                    type="text"
                    id="questionLabel"
                    value={questionLabel}
                    onChange={(e) => setQuestionLabel(e.target.value)}
                    placeholder="e.g., Rate Negotiation, Technical Skills"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Status Messages */}
              {uploadSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  Recording uploaded successfully!
                </div>
              )}
              
              {uploadError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Audio Recorder */}
            <AudioRecorder 
              onRecordingComplete={handleRecordingComplete}
              isUploading={isUploading}
            />
          </div>
        ) : (
          <RecordingsList />
        )}
      </main>
    </div>
  );
}

export default App;