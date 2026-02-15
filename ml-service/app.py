from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client
from dotenv import load_dotenv
import os
from sentiment_model import analyze_sentiment

load_dotenv()

app = Flask(__name__)
CORS(app)

# Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL') or 'https://cxtexkqrairvefvufamh.supabase.co'
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4dGV4a3FyYWlydmVmdnVmYW1oIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY1ODkwNiwiZXhwIjoyMDg2MjM0OTA2fQ.yexGh7BtwgPhCmq0JOMdq86e-o9JSmkxHI7ZlYTgDaI'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    try:
        limit = request.args.get('limit', 100, type=int)
        response = supabase.table('reviews').select('*').limit(limit).order('created_at', desc=True).execute()
        return jsonify(response.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/stats', methods=['GET'])
def get_stats():
    try:
        all_reviews = supabase.table('reviews').select('sentiment_score').execute()
        
        total = len(all_reviews.data)
        positive = sum(1 for r in all_reviews.data if r.get('sentiment_score') == 'positive')
        neutral = sum(1 for r in all_reviews.data if r.get('sentiment_score') == 'neutral')
        negative = sum(1 for r in all_reviews.data if r.get('sentiment_score') == 'negative')
        
        return jsonify({
            'total': total,
            'positive': positive,
            'neutral': neutral,
            'negative': negative
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-review', methods=['POST'])
def analyze_review():
    try:
        data = request.json
        review_text = data.get('reviewText', '')
        
        # Analyze sentiment
        sentiment_result = analyze_sentiment(review_text)
        
        # Insert into database
        review_data = {
            'business_name': data.get('businessName'),
            'business_category': data.get('businessCategory'),
            'city': data.get('city'),
            'address': data.get('address'),
            'reviewer_name': data.get('reviewerName'),
            'review_rating': data.get('reviewRating'),
            'review_text': review_text,
            'meal_type': data.get('mealType'),
            'price_per_person': data.get('pricePerPerson'),
            'sentiment_score': sentiment_result['sentiment'],
            'sentiment_confidence': sentiment_result['confidence']
        }
        
        response = supabase.table('reviews').insert(review_data).execute()
        
        return jsonify({
            'message': 'Review analyzed and saved',
            'sentiment': sentiment_result['sentiment'],
            'confidence': sentiment_result['confidence'],
            'data': response.data
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reviews/analyze-all', methods=['POST'])
def analyze_all():
    try:
        # Get reviews without sentiment
        reviews = supabase.table('reviews').select('*').is_('sentiment_score', 'null').execute()
        
        count = 0
        for review in reviews.data:
            if review.get('review_text'):
                sentiment_result = analyze_sentiment(review['review_text'])
                
                supabase.table('reviews').update({
                    'sentiment_score': sentiment_result['sentiment'],
                    'sentiment_confidence': sentiment_result['confidence']
                }).eq('id', review['id']).execute()
                
                count += 1
        
        return jsonify({
            'message': f'Analyzed {count} reviews successfully'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)), debug=True)