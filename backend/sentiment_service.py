from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import warnings

# Suppress scikit-learn version warnings
warnings.filterwarnings('ignore', category=UserWarning)

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js requests

# Get the directory where this script is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load your .joblib model
try:
    model_path = os.path.join(BASE_DIR, 'sentiment_model.joblib')
    
    print(f"📂 BASE_DIR: {BASE_DIR}")
    print(f"📄 Loading model from: {model_path}")
    
    # Check if file exists
    if not os.path.exists(model_path):
        print(f"❌ Model file not found: {model_path}")
        raise FileNotFoundError(f"Model file not found: {model_path}")
    
    model = joblib.load(model_path)
    print("✅ Model loaded successfully!")
    print(f"✅ Model type: {type(model)}")
    
    # Check if it's a pipeline
    if hasattr(model, 'named_steps'):
        print("✅ Model is a Pipeline with steps:", list(model.named_steps.keys()))
    
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'model_type': str(type(model)) if model else None,
        'base_dir': BASE_DIR
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Predict sentiment for a single review"""
    try:
        data = request.json
        review_text = data.get('text', '')
        
        print(f"📥 Received request with text: '{review_text[:50]}...'")
        
        if not review_text:
            return jsonify({'error': 'No text provided'}), 400

        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500

        # Since model is a pipeline, pass text directly
        print(f"🔮 Predicting sentiment...")
        
        try:
            # Model is a pipeline - it handles vectorization internally
            prediction = model.predict([review_text])[0]
            print(f"✅ Raw prediction: {prediction}")
            
            # Get probability if available
            confidence = 0.0
            if hasattr(model, 'predict_proba'):
                probabilities = model.predict_proba([review_text])[0]
                confidence = float(max(probabilities))
                print(f"✅ Probabilities: {probabilities}")
                print(f"✅ Confidence: {confidence}")
        except Exception as pred_error:
            print(f"❌ Prediction error: {pred_error}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': f'Prediction failed: {str(pred_error)}'}), 500
        
        # Map numerical output to labels
        # Adjust based on your model's output
        labels = {0: 'negative', 1: 'neutral', 2: 'positive'}
        sentiment = labels.get(int(prediction), 'neutral')
        
        print(f"✅ Final sentiment: {sentiment} (confidence: {confidence:.2f})")
        
        return jsonify({
            'sentiment': sentiment,
            'confidence': confidence,
            'prediction': int(prediction),
            'model_type': 'joblib_sklearn_pipeline'
        })
    
    except Exception as e:
        print(f"❌ Error in prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    """Predict sentiment for multiple reviews"""
    try:
        data = request.json
        reviews = data.get('reviews', [])
        
        print(f"📥 Received batch request with {len(reviews)} reviews")
        
        if not reviews:
            return jsonify({'error': 'No reviews provided'}), 400

        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500

        results = []
        labels = {0: 'negative', 1: 'neutral', 2: 'positive'}
        
        for i, review in enumerate(reviews):
            review_id = review.get('id')
            review_text = review.get('text', '')
            
            print(f"🔮 Processing review {i+1}/{len(reviews)}: {review_id}")
            
            if not review_text.strip():
                results.append({
                    'id': review_id,
                    'sentiment': 'neutral',
                    'confidence': 0.0,
                    'error': 'Empty text'
                })
                continue
            
            try:
                # Predict using pipeline
                prediction = model.predict([review_text])[0]
                
                confidence = 0.0
                if hasattr(model, 'predict_proba'):
                    probabilities = model.predict_proba([review_text])[0]
                    confidence = float(max(probabilities))
                
                sentiment = labels.get(int(prediction), 'neutral')
                
                results.append({
                    'id': review_id,
                    'sentiment': sentiment,
                    'confidence': confidence,
                    'prediction': int(prediction)
                })
                
                print(f"✅ Review {review_id}: {sentiment} ({confidence:.2f})")
                
            except Exception as pred_error:
                print(f"❌ Error predicting review {review_id}: {pred_error}")
                results.append({
                    'id': review_id,
                    'sentiment': 'neutral',
                    'confidence': 0.0,
                    'error': str(pred_error)
                })
        
        print(f"✅ Batch prediction completed: {len(results)} results")
        
        return jsonify({'results': results})
    
    except Exception as e:
        print(f"❌ Error in batch prediction: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('ML_PORT', 5000))
    print("\n" + "="*50)
    print("🤖 ML Sentiment Analysis Service")
    print("="*50)
    print(f"📡 Server running on: http://localhost:{port}")
    print(f"🏥 Health check: http://localhost:{port}/health")
    print(f"🔮 Predict endpoint: http://localhost:{port}/predict")
    
    if model is not None:
        print("✅ Model is ready!")
    else:
        print("❌ Model failed to load - predictions will fail")
    
    print("="*50 + "\n")
    
    app.run(host='0.0.0.0', port=port, debug=True)