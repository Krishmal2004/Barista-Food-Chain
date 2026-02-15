import pandas as pd
from supabase import create_client
from dotenv import load_dotenv
import os
from sentiment_model import analyze_sentiment

load_dotenv()

supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

def load_csv_to_database():
    # Read CSV
    df = pd.read_csv('../preprocessed_barista_reviews.csv')
    
    print(f"Loading {len(df)} reviews from CSV...")
    
    for index, row in df.iterrows():
        try:
            # Analyze sentiment
            review_text = str(row.get('review_text', ''))
            sentiment_result = analyze_sentiment(review_text)
            
            review_data = {
                'business_name': str(row.get('business_name', '')),
                'business_category': str(row.get('business_category', '')),
                'address': str(row.get('address', '')),
                'city': str(row.get('city', '')),
                'latitude': float(row.get('latitude', 0)) if pd.notna(row.get('latitude')) else None,
                'longitude': float(row.get('longitude', 0)) if pd.notna(row.get('longitude')) else None,
                'reviewer_name': str(row.get('reviewer_name', '')),
                'review_rating': int(row.get('review_rating', 0)) if pd.notna(row.get('review_rating')) else None,
                'review_text': review_text,
                'review_date': str(row.get('review_date', '')) if pd.notna(row.get('review_date')) else None,
                'price_per_person': str(row.get('price_per_person', '')),
                'meal_type': str(row.get('meal_type', '')),
                'sentiment_score': sentiment_result['sentiment'],
                'sentiment_confidence': sentiment_result['confidence']
            }
            
            supabase.table('reviews').insert(review_data).execute()
            
            if (index + 1) % 100 == 0:
                print(f"Loaded {index + 1} reviews...")
                
        except Exception as e:
            print(f"Error loading row {index}: {e}")
            continue
    
    print("✅ CSV data loaded successfully!")

if __name__ == '__main__':
    load_csv_to_database()