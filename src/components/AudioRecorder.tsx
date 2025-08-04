import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, Loader, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isUploading: boolean;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  isUploading
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSupported, setIsSupported] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check if MediaRecorder is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setIsSupported(false);
      setError('Audio recording is not supported in this browser. Please use Chrome, Firefox, or Safari.');
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Using supported MIME type:', type);
        return type;
      }
    }
    console.log('Using fallback MIME type: audio/webm');
    return 'audio/webm'; // fallback
  };

  const startRecording = async () => {
    try {
      setError('');
      console.log('Starting recording process...');
      
      // Request microphone access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      console.log('Got media stream:', stream);
      streamRef.current = stream;
      
      // Check if stream has audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks found in media stream');
      }
      
      console.log('Audio tracks:', audioTracks.length);
      
      // Get supported MIME type
      const mimeType = getSupportedMimeType();
      
      // Create MediaRecorder with minimal options first
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { 
          mimeType: mimeType
        });
      } catch (e) {
        console.log('Failed with mimeType, trying without options');
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available event:', event.data.size, 'bytes', event.data.type);
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Total chunks so far:', audioChunksRef.current.length);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped. Total chunks:', audioChunksRef.current.length);
        
        if (audioChunksRef.current.length === 0) {
          setError('No audio data was recorded. Please try again.');
          return;
        }
        
        // Calculate total size
        const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
        console.log('Total audio data size:', totalSize, 'bytes');
        
        if (totalSize === 0) {
          setError('Recorded audio file is empty. Please check your microphone and try again.');
          return;
        }
        
        // Create blob with the same type as the chunks
        const firstChunkType = audioChunksRef.current[0]?.type || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: firstChunkType });
        console.log('Created audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        if (audioBlob.size > 0) {
          const url = URL.createObjectURL(audioBlob);
          setAudioBlob(audioBlob);
          setAudioUrl(url);
          console.log('Audio blob URL created:', url);
        } else {
          setError('Failed to create audio file. Please try recording again.');
        }
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            console.log('Stopping track:', track.kind, track.label);
            track.stop();
          });
          streamRef.current = null;
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        setIsRecording(false);
      };
      
      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started');
      };
      
      // Start recording - request data more frequently
      console.log('Starting MediaRecorder...');
      mediaRecorder.start(100); // Request data every 100ms
      
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      console.log('Recording started successfully');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      let errorMessage = 'Error accessing microphone. ';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Please allow microphone access and try again.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone.';
        } else if (error.name === 'NotSupportedError') {
          errorMessage += 'Audio recording is not supported in this browser.';
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Microphone is being used by another application.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Please check your microphone permissions.';
      }
      
      setError(errorMessage);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      
      // Stop the timer first
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      setIsRecording(false);
      
      // Stop recording
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }
  };

  const handleUpload = () => {
    if (audioBlob) {
      console.log('Uploading audio blob:', audioBlob.size, 'bytes');
      onRecordingComplete(audioBlob);
    }
  };

  const resetRecording = () => {
    console.log('Resetting recording...');
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl('');
    setRecordingTime(0);
    setError('');
    audioChunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSupported) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 text-red-600 justify-center">
          <AlertCircle className="w-5 h-5" />
          <span>Audio recording is not supported in this browser</span>
        </div>
        <p className="text-sm text-gray-600 text-center mt-2">
          Please use Chrome, Firefox, or Safari for the best experience.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      
      <div className="text-center">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        )}
        
        {isRecording && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              <span className="font-medium">Recording: {formatTime(recordingTime)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <Square className="w-5 h-5" />
              Stop Recording
            </button>
          </div>
        )}
        
        {audioBlob && audioUrl && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-2">
              Recording complete ({Math.round(audioBlob.size / 1024)} KB)
            </div>
            <audio 
              controls 
              src={audioUrl}
              className="w-full max-w-md mx-auto"
              preload="metadata"
            />
            <div className="flex gap-3 justify-center">
              <button
                onClick={resetRecording}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Record Again
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isUploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Recording
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};