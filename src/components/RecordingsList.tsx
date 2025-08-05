import React, { useState, useEffect } from 'react';
import { Play, ExternalLink, Loader, RefreshCw } from 'lucide-react';
import { supabase, RecordingLog, User, isAdmin } from '../lib/supabase';

interface RecordingsListProps {
  user: User;
}

export const RecordingsList: React.FC<RecordingsListProps> = ({ user }) => {
  const [recordings, setRecordings] = useState<RecordingLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchRecordings = async () => {
    setLoading(true);
    setError('');
    
    try {
      let query = supabase
        .from('recording_logs')
        .select('*');
      
      // If not admin, only show user's own recordings
      if (!isAdmin(user)) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRecordings(data || []);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Failed to load recordings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Loader className="w-5 h-5 animate-spin" />
          Loading recordings...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isAdmin(user) ? 'All Recordings' : 'My Recordings'}
            <span className="text-sm font-normal text-gray-500 ml-2">({recordings.length} total)</span>
          </h2>
          <button
            onClick={fetchRecordings}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}
      </div>
      
      <div className="divide-y divide-gray-200">
        {recordings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {isAdmin(user) ? 'No recordings found in the system.' : 'No recordings found. Upload your first recording above!'}
          </div>
        ) : (
          recordings.map((recording) => (
            <div key={recording.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-medium text-gray-900">
                      {recording.candidate_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {recording.question_label}
                    </span>
                      {recording.question_position && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                          Q{recording.question_position}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 mb-3">
                    {recording.created_at && formatDate(recording.created_at)}
                    {isAdmin(user) && recording.user_id && (
                      <span className="ml-2 text-purple-600">• User ID: {recording.user_id.slice(0, 8)}...</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <audio 
                      controls 
                      src={recording.file_url}
                      className="max-w-sm"
                    />
                    <a
                      href={recording.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open File
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};