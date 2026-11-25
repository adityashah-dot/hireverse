"""
whisper_client.py — Groq Whisper API client for speech-to-text
Replaces the original remote_whisper_client.py
"""
import os
import tempfile
import mimetypes

try:
    from groq import Groq
    _groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
except ImportError:
    _groq_client = None


class GroqWhisperClient:
    """Transcribes audio using Groq's hosted Whisper model."""

    def __init__(self):
        self.client = _groq_client
        self.model = "whisper-large-v3"
        print(f"🎙️ GroqWhisperClient initialized (model: {self.model})")

    def transcribe_file(self, audio_file_path: str, language: str = "en") -> str:
        """
        Transcribe audio file using Groq Whisper API.
        Supports wav, mp3, mp4, webm, ogg, m4a.
        """
        try:
            if self.client is None:
                raise RuntimeError("Groq client not initialized — check GROQ_API_KEY")

            print(f"🎤 Sending audio to Groq Whisper: {audio_file_path}")
            file_size = os.path.getsize(audio_file_path)
            if file_size < 2048:
                print(f"⚠️ Audio file too small for reliable STT ({file_size} bytes)")
                return ""

            mime_type, _ = mimetypes.guess_type(audio_file_path)
            if not mime_type:
                ext = os.path.splitext(audio_file_path)[1].lower()
                if ext == ".webm":
                    mime_type = "audio/webm"
                elif ext == ".wav":
                    mime_type = "audio/wav"
                elif ext == ".ogg":
                    mime_type = "audio/ogg"
                elif ext == ".mp4":
                    mime_type = "audio/mp4"
                else:
                    mime_type = "application/octet-stream"

            with open(audio_file_path, "rb") as audio_file:
                payload = (os.path.basename(audio_file_path), audio_file.read(), mime_type)
                transcription = self.client.audio.transcriptions.create(
                    file=payload,
                    model=self.model,
                    language=language,
                    response_format="text",
                )

            # Groq returns a string when response_format="text"
            transcript = str(transcription).strip()
            print(f"✅ Groq transcription: '{transcript[:100]}{'...' if len(transcript) > 100 else ''}'")
            return transcript

        except Exception as e:
            print(f"❌ Groq Whisper error: {e}")
            return ""


# Global instance
remote_whisper_client = GroqWhisperClient()
