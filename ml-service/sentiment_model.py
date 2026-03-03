import numpy as np
import os
import re
import pickle

# Try to import TensorFlow/Keras
try:
    from tensorflow.keras.models import load_model
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    KERAS_AVAILABLE = True
except ImportError:
    try:
        from keras.models import load_model
        from keras.preprocessing.sequence import pad_sequences
        KERAS_AVAILABLE = True
    except ImportError:
        KERAS_AVAILABLE = False

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, 'lstm_sentiment_model.keras')
TOKENIZER_PATH = os.path.join(MODEL_DIR, 'tokenizer.pickle')

# Global variables for the model and tokenizer
model = None
tokenizer = None
MAX_SEQUENCE_LENGTH = 200  # Must match what was used during training


def clean_text(text):
    """Clean review text the same way as in the notebook preprocessing."""
    if not text or not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def load_lstm_model():
    """Load the LSTM model and tokenizer."""
    global model, tokenizer

    if not KERAS_AVAILABLE:
        print("WARNING: TensorFlow/Keras not available. Using fallback sentiment analysis.")
        return False

    try:
        if os.path.exists(MODEL_PATH):
            model = load_model(MODEL_PATH)
            print(f"LSTM model loaded from {MODEL_PATH}")
        else:
            print(f"WARNING: Model file not found at {MODEL_PATH}")
            return False

        if os.path.exists(TOKENIZER_PATH):
            with open(TOKENIZER_PATH, 'rb') as f:
                tokenizer = pickle.load(f)
            print(f"Tokenizer loaded from {TOKENIZER_PATH}")
        else:
            print(f"WARNING: Tokenizer not found at {TOKENIZER_PATH}. Will use fallback.")
            return False

        return True
    except Exception as e:
        print(f"Error loading LSTM model: {e}")
        return False


def fallback_sentiment(text):
    """
    Simple keyword-based fallback sentiment analysis.
    Returns a score between -1 and 1.
    """
    if not text:
        return 0.0

    text = text.lower()

    positive_words = [
        'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
        'love', 'best', 'perfect', 'delicious', 'friendly', 'nice', 'cozy',
        'clean', 'recommend', 'outstanding', 'superb', 'awesome', 'brilliant',
        'satisfied', 'happy', 'fresh', 'warm', 'welcoming', 'pleasant',
        'comfortable', 'attentive', 'professional', 'exceptional'
    ]
    negative_words = [
        'bad', 'worst', 'terrible', 'horrible', 'poor', 'awful', 'disappointing',
        'rude', 'dirty', 'slow', 'cold', 'stale', 'overpriced', 'expensive',
        'disgusting', 'tasteless', 'unfriendly', 'unprofessional', 'mediocre',
        'dissatisfied', 'disappointed', 'uncomfortable', 'noisy', 'crowded'
    ]

    positive_count = sum(1 for word in positive_words if word in text)
    negative_count = sum(1 for word in negative_words if word in text)

    total = positive_count + negative_count
    if total == 0:
        return 0.0

    return (positive_count - negative_count) / total


def analyze_sentiment(text):
    """
    Analyze the sentiment of the given text using LSTM model or fallback.
    Returns a dict with sentiment label and score.
    """
    cleaned = clean_text(text)

    if model is not None and tokenizer is not None:
        try:
            seq = tokenizer.texts_to_sequences([cleaned])
            padded = pad_sequences(seq, maxlen=MAX_SEQUENCE_LENGTH)
            prediction = model.predict(padded, verbose=0)

            # Handle different output shapes
            if prediction.shape[-1] == 3:
                # Multi-class: [negative, neutral, positive]
                label_idx = np.argmax(prediction[0])
                labels = ['negative', 'neutral', 'positive']
                label = labels[label_idx]
                confidence = float(prediction[0][label_idx])
                score = float(prediction[0][2] - prediction[0][0])  # positive - negative
            elif prediction.shape[-1] == 1:
                # Binary/regression output
                score = float(prediction[0][0])
                if score > 0.6:
                    label = 'positive'
                elif score < 0.4:
                    label = 'negative'
                else:
                    label = 'neutral'
                confidence = abs(score - 0.5) * 2
            else:
                score = float(prediction[0][0])
                label = 'positive' if score > 0 else ('negative' if score < 0 else 'neutral')
                confidence = abs(score)

            return {
                'sentiment': label,
                'score': round(score, 4),
                'confidence': round(confidence, 4),
                'method': 'lstm'
            }
        except Exception as e:
            print(f"LSTM prediction error: {e}")

    # Fallback
    score = fallback_sentiment(cleaned)
    if score > 0.1:
        label = 'positive'
    elif score < -0.1:
        label = 'negative'
    else:
        label = 'neutral'

    return {
        'sentiment': label,
        'score': round(score, 4),
        'confidence': round(abs(score), 4),
        'method': 'fallback'
    }
