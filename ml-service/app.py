from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
import os
from sentiment_model import analyze_sentiment, load_lstm_model
from chatbot_engine import ChatbotEngine

app = Flask(__name__)
CORS(app)


def safe_json_response(data):
    """Convert data to JSON, handling NaN/None/NaT values safely."""
    def clean_value(v):
        if v is None:
            return None
        if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
            return None
        if isinstance(v, (np.integer,)):
            return int(v)
        if isinstance(v, (np.floating,)):
            return float(v)
        if isinstance(v, pd.Timestamp):
            return str(v)
        return v

    if isinstance(data, list):
        cleaned = [{k: clean_value(v) for k, v in row.items()} for row in data]
    elif isinstance(data, dict):
        cleaned = {k: clean_value(v) for k, v in data.items()}
    else:
        cleaned = data

    return Response(
        json.dumps(cleaned, ensure_ascii=False, default=str),
        mimetype='application/json'
    )

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, '..', 'preprocessed_barista_reviews.csv')

# Load the LSTM model at startup
print("Loading LSTM model...")
model_loaded = load_lstm_model()
if model_loaded:
    print("LSTM model loaded successfully!")
else:
    print("LSTM model not loaded - using fallback sentiment analysis")

# Load review data
reviews_df = None
chatbot = None


def load_reviews():
    """Load and cache the reviews CSV."""
    global reviews_df
    if reviews_df is None:
        try:
            reviews_df = pd.read_csv(CSV_PATH)
            # Strip whitespace from column names
            reviews_df.columns = reviews_df.columns.str.strip()
            print(f"Loaded {len(reviews_df)} reviews from CSV")
        except Exception as e:
            print(f"Error loading CSV: {e}")
            reviews_df = pd.DataFrame()
    return reviews_df


def init_chatbot():
    """Initialize the chatbot engine after reviews are loaded."""
    global chatbot
    df = load_reviews()
    if not df.empty:
        chatbot = ChatbotEngine(df)
        print(f"Chatbot engine initialized with {len(df)} reviews")
    else:
        print("WARNING: Chatbot not initialized — no review data")


def classify_sentiment(score):
    """Classify a numeric sentiment_score into a label."""
    if pd.isna(score) or score == 0:
        return 'neutral'
    elif score > 0.1:
        return 'positive'
    elif score < -0.1:
        return 'negative'
    else:
        return 'neutral'


@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    """Get reviews with optional limit."""
    try:
        df = load_reviews()
        limit = request.args.get('limit', 100, type=int)

        # Select relevant columns and limit results
        columns = [
            'business_name', 'review_text', 'review_rating',
            'review_date', 'sentiment_score', 'city',
            'clean_review_text', 'reviewer_name',
            'business_avg_rating', 'address'
        ]
        available_cols = [c for c in columns if c in df.columns]
        result_df = df[available_cols].head(limit).copy()

        # Add sentiment label
        if 'sentiment_score' in result_df.columns:
            result_df['sentiment_label'] = result_df['sentiment_score'].apply(classify_sentiment)

        # Replace NaN with None for JSON serialization
        result_df = result_df.where(pd.notnull(result_df), None)

        return safe_json_response(result_df.to_dict(orient='records'))
    except Exception as e:
        print(f"Error in /api/reviews: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reviews/stats', methods=['GET'])
def get_review_stats():
    """Get review statistics including sentiment distribution."""
    try:
        df = load_reviews()

        if 'sentiment_score' not in df.columns:
            return jsonify({
                'total': len(df),
                'positive': 0,
                'neutral': 0,
                'negative': 0
            })

        sentiments = df['sentiment_score'].apply(classify_sentiment)

        stats = {
            'total': len(df),
            'positive': int((sentiments == 'positive').sum()),
            'neutral': int((sentiments == 'neutral').sum()),
            'negative': int((sentiments == 'negative').sum())
        }

        return jsonify(stats)
    except Exception as e:
        print(f"Error in /api/reviews/stats: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reviews/branches', methods=['GET'])
def get_branch_stats():
    """Get per-branch statistics for visualization."""
    try:
        df = load_reviews()

        if df.empty or 'business_name' not in df.columns:
            return jsonify([])

        branches = []
        for name, group in df.groupby('business_name'):
            sentiments = group['sentiment_score'].apply(classify_sentiment) if 'sentiment_score' in group.columns else pd.Series(['neutral'] * len(group))

            avg_rating = float(group['review_rating'].mean()) if 'review_rating' in group.columns else 0
            avg_sentiment = float(group['sentiment_score'].mean()) if 'sentiment_score' in group.columns else 0

            city = group['city'].iloc[0] if 'city' in group.columns and pd.notna(group['city'].iloc[0]) else 'Unknown'

            # Aspect scores
            def safe_mean(col):
                if col in group.columns:
                    vals = group[col].dropna()
                    return round(float(vals.mean()), 2) if len(vals) > 0 else None
                return None

            branches.append({
                'branch_name': str(name),
                'city': str(city),
                'total_reviews': int(len(group)),
                'avg_rating': round(avg_rating, 2),
                'avg_sentiment': round(avg_sentiment, 4),
                'positive': int((sentiments == 'positive').sum()),
                'neutral': int((sentiments == 'neutral').sum()),
                'negative': int((sentiments == 'negative').sum()),
                'positive_pct': round((sentiments == 'positive').sum() / len(group) * 100, 1) if len(group) > 0 else 0,
                'negative_pct': round((sentiments == 'negative').sum() / len(group) * 100, 1) if len(group) > 0 else 0,
                'atmosphere_score': safe_mean('detailed_atmosphere_rating'),
                'food_score': safe_mean('detailed_food_rating'),
                'service_score': safe_mean('detailed_service_rating'),
                'price_avg': safe_mean('price_numeric_avg'),
            })

        # Sort by total reviews descending
        branches.sort(key=lambda x: x['total_reviews'], reverse=True)

        return safe_json_response(branches)
    except Exception as e:
        print(f"Error in /api/reviews/branches: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/analyze-review', methods=['POST'])
def analyze_review():
    """Analyze sentiment of a single review text."""
    try:
        data = request.get_json()
        text = data.get('text', '')

        if not text:
            return jsonify({'error': 'No text provided'}), 400

        result = analyze_sentiment(text)
        return jsonify(result)
    except Exception as e:
        print(f"Error in /api/analyze-review: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/chatbot', methods=['POST'])
def chatbot_endpoint():
    """Process a chatbot message and return AI-generated analysis."""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        context = data.get('context', {})

        if not message:
            return jsonify({'error': 'No message provided'}), 400

        if chatbot is None:
            return jsonify({
                'type': 'error',
                'message': 'Chatbot is not initialized. Please wait for data to load.'
            }), 503

        result = chatbot.process_message(message, context=context)
        return safe_json_response(result)
    except Exception as e:
        print(f"Error in /api/chatbot: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reviews/analyze-all', methods=['POST'])
def analyze_all_reviews():
    """Re-analyze all reviews using the LSTM model."""
    try:
        df = load_reviews()

        analyzed = 0
        for idx, row in df.iterrows():
            text = row.get('review_text', '') or row.get('clean_review_text', '')
            if text and isinstance(text, str) and len(text.strip()) > 0:
                result = analyze_sentiment(text)
                df.at[idx, 'sentiment_score'] = result['score']
                analyzed += 1

        return jsonify({
            'message': f'Analyzed {analyzed} reviews',
            'total': len(df),
            'analyzed': analyzed
        })
    except Exception as e:
        print(f"Error in /api/reviews/analyze-all: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model_loaded,
        'gemini_loaded': chatbot.gemini_loaded if chatbot else False,
        'reviews_loaded': reviews_df is not None and len(reviews_df) > 0
    })


if __name__ == '__main__':
    # Pre-load reviews and initialize chatbot
    load_reviews()
    init_chatbot()
    print("Starting Flask ML service on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
# Trigger reload

