import joblib
import os
from pathlib import Path
import re

# Get the path to the model file
MODEL_PATH = Path(__file__).parent / 'sentiment_model.joblib'

# Load your trained model
print(f"📂 Loading model from: {MODEL_PATH}")

try:
    model_data = joblib.load(MODEL_PATH)
    print(f"✅ Model loaded successfully!")
    
    # Check what's in the model file
    if isinstance(model_data, dict):
        # Model saved as dictionary with model and vectorizer
        model = model_data.get('model')
        vectorizer = model_data.get('vectorizer')
        print(f"✅ Found model and vectorizer in dictionary")
        
        # Print model info if available
        if 'accuracy' in model_data:
            print(f"📊 Model accuracy: {model_data['accuracy']:.2%}")
        if 'classes' in model_data:
            print(f"🏷️  Classes: {model_data['classes']}")
            
    else:
        # Model saved directly (might need to check the structure)
        print(f"⚠️  Model structure: {type(model_data)}")
        model = model_data
        vectorizer = None
        
except FileNotFoundError:
    print(f"❌ ERROR: Model file not found at: {MODEL_PATH}")
    print("\n🔍 Please make sure 'sentiment_model.joblib' is in the ml-service folder:")
    print(f"   Expected location: {MODEL_PATH}")
    print("\n💡 Current directory contents:")
    for file in Path(__file__).parent.glob('*'):
        print(f"   - {file.name}")
    model = None
    vectorizer = None
    
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print(f"❌ Error type: {type(e).__name__}")
    model = None
    vectorizer = None


def preprocess_text(text: str) -> str:
    """
    Preprocess text before sentiment analysis
    (Should match the preprocessing used during training)
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = str(text).lower()
    
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    
    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^a-zA-Z\s.,!?]', '', text)
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    return text


def analyze_sentiment(text: str) -> dict:
    """
    Analyze sentiment of text using your trained model
    Returns: {'sentiment': 'positive/neutral/negative', 'confidence': 0.95}
    """
    if not text or text.strip() == '':
        return {'sentiment': 'neutral', 'confidence': 0.0}
    
    # Check if model is loaded
    if model is None:
        print("⚠️ Model not loaded, returning neutral sentiment")
        return {'sentiment': 'neutral', 'confidence': 0.0}
    
    try:
        # Preprocess the text
        processed_text = preprocess_text(text)
        
        if not processed_text:
            return {'sentiment': 'neutral', 'confidence': 0.0}
        
        # Transform text using vectorizer
        if vectorizer is not None:
            text_vectorized = vectorizer.transform([processed_text])
        else:
            # If no vectorizer, use processed text directly
            text_vectorized = [processed_text]
        
        # Get prediction
        prediction = model.predict(text_vectorized)[0]
        
        # Get confidence scores
        try:
            probabilities = model.predict_proba(text_vectorized)[0]
            confidence = float(max(probabilities))
        except AttributeError:
            # If model doesn't have predict_proba
            confidence = 0.85
        
        # Convert prediction to standard format
        if isinstance(prediction, str):
            sentiment = prediction.lower()
        elif isinstance(prediction, (int, float, np.integer)):
            # Map numeric predictions to labels
            # Common mappings:
            # 0 = negative, 1 = neutral, 2 = positive OR
            # 0 = negative, 1 = positive
            prediction = int(prediction)
            
            # Try to use model's classes if available
            if hasattr(model, 'classes_'):
                sentiment = str(model.classes_[prediction]).lower()
            else:
                # Default mapping (adjust based on your model)
                sentiment_map = {
                    0: 'negative',
                    1: 'neutral',
                    2: 'positive'
                }
                sentiment = sentiment_map.get(prediction, 'neutral')
        else:
            sentiment = str(prediction).lower()
        
        # Ensure sentiment is one of the expected values
        if sentiment not in ['positive', 'neutral', 'negative']:
            # Try to map common variations
            if 'pos' in sentiment:
                sentiment = 'positive'
            elif 'neg' in sentiment:
                sentiment = 'negative'
            else:
                sentiment = 'neutral'
        
        return {
            'sentiment': sentiment,
            'confidence': float(confidence)
        }
        
    except Exception as e:
        print(f"❌ Error analyzing sentiment: {e}")
        import traceback
        traceback.print_exc()
        return {'sentiment': 'neutral', 'confidence': 0.0}


# Test the model when this file is run directly
if __name__ == '__main__':
    print("\n" + "="*60)
    print("🧪 TESTING SENTIMENT MODEL")
    print("="*60)
    
    if model is None:
        print("\n❌ Cannot test - model not loaded!")
        print("\n📋 Troubleshooting steps:")
        print("1. Check if sentiment_model.joblib exists in ml-service folder")
        print("2. Verify the file is not corrupted")
        print("3. Check if you have the required libraries (scikit-learn, joblib)")
    else:
        test_reviews = [
            "This coffee is amazing! Best I've ever had!",
            "Terrible service, would not recommend at all",
            "The place is okay, nothing special",
            "Great atmosphere and very friendly staff",
            "Horrible experience, worst barista ever",
            "Pretty good coffee, nice location"
        ]
        
        print("\n📝 Testing with sample reviews:\n")
        
        for i, review in enumerate(test_reviews, 1):
            result = analyze_sentiment(review)
            
            # Color coding for terminal
            emoji = {
                'positive': '😊',
                'neutral': '😐',
                'negative': '😞'
            }
            
            print(f"{i}. Text: {review}")
            print(f"   {emoji.get(result['sentiment'], '❓')} Sentiment: {result['sentiment'].upper()}")
            print(f"   📊 Confidence: {result['confidence']:.2%}")
            print()
    
    print("="*60)