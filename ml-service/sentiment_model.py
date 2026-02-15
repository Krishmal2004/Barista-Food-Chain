from transformers import pipeline

# Load sentiment analysis model (lightweight and fast)
sentiment_analyzer = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

def analyze_sentiment(text: str) -> dict:
    """
    Analyze sentiment of text
    Returns: {'sentiment': 'positive/neutral/negative', 'confidence': 0.95}
    """
    if not text or text.strip() == '':
        return {'sentiment': 'neutral', 'confidence': 0.0}
    
    try:
        result = sentiment_analyzer(text[:512])[0]  # Limit to 512 chars for model
        
        label = result['label'].lower()
        confidence = result['score']
        
        # Map labels
        if label == 'positive':
            sentiment = 'positive'
        elif label == 'negative':
            sentiment = 'negative'
        else:
            sentiment = 'neutral'
        
        # Neutral if confidence is low
        if confidence < 0.6:
            sentiment = 'neutral'
        
        return {
            'sentiment': sentiment,
            'confidence': float(confidence)
        }
    except Exception as e:
        print(f"Error analyzing sentiment: {e}")
        return {'sentiment': 'neutral', 'confidence': 0.0}