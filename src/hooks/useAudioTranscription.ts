import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB - Whisper limit

export function useAudioTranscription() {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcribeAudio = async (file: File): Promise<string | null> => {
    if (file.size > MAX_FILE_SIZE) {
      const errorMsg = 'Arquivo muito grande. Máximo permitido: 25MB';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setIsTranscribing(true);
    setError(null);
    setTranscription(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error: fnError } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64,
          mimeType: file.type
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setTranscription(data.text);
      toast.success('Áudio transcrito com sucesso!');
      return data.text;

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao transcrever áudio';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  const resetTranscription = () => {
    setTranscription(null);
    setError(null);
  };

  return {
    isTranscribing,
    transcription,
    error,
    transcribeAudio,
    resetTranscription,
  };
}
