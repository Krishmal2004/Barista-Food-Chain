"""
Chatbot Engine for Barista Food Chain Sentiment Analysis.
Uses HuggingFace pretrained models (DistilBERT & Flan-T5) for accurate
sentiment analysis and natural response generation, with keyword-based fallback.
"""

import re
import numpy as np
import pandas as pd

# Import the custom LSTM sentiment analysis module
try:
    from sentiment_model import analyze_sentiment
    LSTM_AVAILABLE = True
except ImportError:
    LSTM_AVAILABLE = False
    print("[Chatbot] WARNING: sentiment_model.py not found. Sentiment analysis disabled.")

# Try to import Google GenAI
try:
    from google import genai
    from dotenv import load_dotenv
    import os
    load_dotenv()
    
    # Load all available Gemini API keys
    GEMINI_API_KEYS = []
    for i in range(1, 10):
        key = os.getenv(f"GEMINI_API_KEY_{i}")
        if key:
            GEMINI_API_KEYS.append(key)
            
    # Fallback to older GEMINI_API_KEY if present
    legacy_key = os.getenv("GEMINI_API_KEY")
    if legacy_key and legacy_key not in GEMINI_API_KEYS:
        GEMINI_API_KEYS.append(legacy_key)
        
    if GEMINI_API_KEYS:
        GEMINI_AVAILABLE = True
        gemini_current_key_idx = 0
        print(f"[Chatbot] Gemini 2.5 API initialized with {len(GEMINI_API_KEYS)} keys for rotation!")
    else:
        GEMINI_AVAILABLE = False
        gemini_current_key_idx = 0
        print("[Chatbot] GEMINI_API_KEYS not found in environment. Gemini disabled.")
except Exception as e:
    GEMINI_AVAILABLE = False
    gemini_current_key_idx = 0
    GEMINI_API_KEYS = []
    print(f"[Chatbot] Failed to initialize Gemini API: {e}")




# ---- Keyword-based Sentiment Fallback ----
POSITIVE_WORDS = {
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'love', 'best', 'perfect', 'delicious', 'friendly', 'nice', 'cozy',
    'clean', 'recommend', 'outstanding', 'superb', 'awesome', 'brilliant',
    'satisfied', 'happy', 'fresh', 'warm', 'welcoming', 'pleasant',
    'comfortable', 'attentive', 'professional', 'exceptional', 'tasty',
    'favorite', 'enjoyed', 'beautiful', 'quality', 'lovely'
}

NEGATIVE_WORDS = {
    'bad', 'worst', 'terrible', 'horrible', 'poor', 'awful', 'disappointing',
    'rude', 'dirty', 'slow', 'cold', 'stale', 'overpriced', 'expensive',
    'disgusting', 'tasteless', 'unfriendly', 'unprofessional', 'mediocre',
    'dissatisfied', 'disappointed', 'uncomfortable', 'noisy', 'crowded',
    'bland', 'burnt', 'watery', 'soggy', 'bitter', 'gross'
}

# Product / aspect keywords
FOOD_KEYWORDS = [
    'coffee', 'tea', 'latte', 'cappuccino', 'espresso', 'mocha', 'macchiato',
    'cake', 'pastry', 'sandwich', 'croissant', 'muffin', 'brownie', 'cookie',
    'food', 'drink', 'beverage', 'breakfast', 'lunch', 'snack', 'dessert',
    'menu', 'juice', 'smoothie', 'frappe', 'milkshake', 'burger', 'wrap',
    'salad', 'soup', 'bread', 'toast', 'waffle', 'pancake', 'chocolate',
    'vanilla', 'caramel', 'iced', 'hot', 'cold brew'
]

SERVICE_KEYWORDS = [
    'service', 'staff', 'waiter', 'waitress', 'barista', 'employee',
    'server', 'manager', 'friendly', 'rude', 'helpful', 'attentive',
    'slow', 'fast', 'quick', 'wait', 'waiting', 'order', 'delivery'
]

ATMOSPHERE_KEYWORDS = [
    'atmosphere', 'ambiance', 'ambience', 'vibe', 'decor', 'interior',
    'seating', 'music', 'noise', 'clean', 'cozy', 'comfortable',
    'crowded', 'spacious', 'wifi', 'parking', 'location', 'view',
    'outdoor', 'indoor', 'lighting', 'temperature'
]

PRICE_KEYWORDS = [
    'price', 'cost', 'expensive', 'cheap', 'affordable', 'overpriced',
    'value', 'worth', 'money', 'budget', 'pricey', 'reasonable'
]


def classify_sentiment_lstm(text):
    """Classify sentiment using the custom LSTM model or fallback."""
    if LSTM_AVAILABLE:
        try:
            result = analyze_sentiment(text)
            return result['sentiment'], result['score']
        except Exception as e:
            print(f"[Chatbot] LSTM analysis failed: {e}")
            pass

    # Keyword fallback
    text_lower = text.lower()
    pos = sum(1 for w in POSITIVE_WORDS if w in text_lower)
    neg = sum(1 for w in NEGATIVE_WORDS if w in text_lower)
    total = pos + neg
    if total == 0:
        return 'neutral', 0.5
    ratio = pos / total
    if ratio > 0.6:
        return 'positive', ratio
    elif ratio < 0.4:
        return 'negative', 1 - ratio
    return 'neutral', 0.5


def generate_gemini_response(prompt_text):
    """Generate natural language response using Gemini 2.5 API with key rotation or return None."""
    global gemini_current_key_idx
    if GEMINI_AVAILABLE and GEMINI_API_KEYS:
        num_keys = len(GEMINI_API_KEYS)
        for _ in range(num_keys):
            try:
                # Initialize client with current key
                client = genai.Client(api_key=GEMINI_API_KEYS[gemini_current_key_idx])
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=f"You are a helpful customer service AI for Barista Coffee Chain. Keep your response conversational, friendly, and concise (under 3 sentences). {prompt_text}"
                )
                return response.text
            except Exception as e:
                print(f"[Chatbot] Gemini API Key {gemini_current_key_idx + 1} failed: {e}")
                # Rotate to the next key
                gemini_current_key_idx = (gemini_current_key_idx + 1) % num_keys
        
        # If we exhausted all keys
        print("[Chatbot] All Gemini API keys failed (likely rate limited).")
        return "API Limit reached"
    return None

def generate_response(prompt_text):
    """Generate natural language response. Prefers Gemini 2.5, falls back to Flan-T5, or returns None."""
    # Try Gemini 2.5 first
    gemini_resp = generate_gemini_response(prompt_text)
    if gemini_resp == "API Limit reached":
        return "API Limit reached"
    elif gemini_resp:
        return gemini_resp

    # We enforce Gemini generation exclusively
    gemini_resp = generate_gemini_response(prompt_text)
    if gemini_resp == "API Limit reached":
        return "API Limit reached"
    elif gemini_resp:
        return gemini_resp
    return None


def extract_products_from_reviews(reviews_texts, sentiments):
    """Extract product mentions and their associated sentiments from reviews."""
    product_sentiments = {}
    for text, sent in zip(reviews_texts, sentiments):
        text_lower = text.lower() if isinstance(text, str) else ''
        for keyword in FOOD_KEYWORDS:
            if keyword in text_lower:
                if keyword not in product_sentiments:
                    product_sentiments[keyword] = {'positive': 0, 'negative': 0, 'neutral': 0, 'total': 0}
                product_sentiments[keyword][sent] += 1
                product_sentiments[keyword]['total'] += 1

    # Sort by total mentions, take top items
    sorted_products = sorted(product_sentiments.items(), key=lambda x: x[1]['total'], reverse=True)
    return sorted_products[:10]


def find_matching_branch(query, branch_names):
    """Find the best matching branch name from the query."""
    query_lower = re.sub(r'[^\w\s]', '', query.lower())  # strip punctuation
    query_words = set(query_lower.split())
    # Words that don't help distinguish between branches
    stop_words = {'barista', 'coffee', 'the', 'at', 'in', 'of', 'and', 'express',
                  'how', 'is', 'are', 'what', 'tell', 'me', 'about', 'do', 'does',
                  'show', 'give', 'please', 'can', 'you', 'branch', 'shop', 'store',
                  'a', 'an', 'to', 'for', 'with', 'this', 'that', 'has', 'have',
                  'i', 'my', 'it', 'its', 'which', 'reviews', 'sentiment', 'analysis',
                  'rating', 'thoughts', 'opinion', 'like', 'think', 'say', 'said',
                  'good', 'bad', 'best', 'worst', 'people', 'customers', 'doing'}
    query_significant = query_words - stop_words

    candidates = []

    for name in branch_names:
        name_lower = name.lower()
        name_words = set(name_lower.split())
        name_significant = name_words - stop_words

        score = 0

        # --- Check: Full branch name is a substring of query ---
        if name_lower in query_lower:
            # Only give a high bonus if the name has distinguishing words
            if name_significant:
                score = 2000 + len(name_lower)
            else:
                # Generic name like just "Barista" — low priority
                score = 50 + len(name_lower)
            candidates.append((name, score))
            continue

        # --- Check: Word overlap between query and branch name ---
        if not query_significant:
            # Query is only stop words, skip word matching
            continue

        overlap = query_significant & name_significant
        if overlap:
            # More overlapping significant words = better match
            specificity = len(overlap)
            # Bonus for covering more of the branch's unique words
            coverage = len(overlap) / max(len(name_significant), 1)
            score = 500 * specificity + 200 * coverage
            candidates.append((name, score))

    if not candidates:
        return None

    # Sort by score descending, pick the best
    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates[0][0]


def detect_topic(query):
    """Detect what aspect the user is asking about."""
    query_lower = query.lower()
    topics = []

    if any(w in query_lower for w in FOOD_KEYWORDS[:20]):
        topics.append('food')
    if any(w in query_lower for w in SERVICE_KEYWORDS[:10]):
        topics.append('service')
    if any(w in query_lower for w in ATMOSPHERE_KEYWORDS[:10]):
        topics.append('atmosphere')
    if any(w in query_lower for w in PRICE_KEYWORDS[:8]):
        topics.append('price')

    return topics if topics else ['general']


def detect_intent(query):
    """Detect the user's intent from their message."""
    query_lower = query.lower().strip()

    # Greeting patterns
    greetings = ['hello', 'hi', 'hey', 'hola', 'greetings', 'good morning',
                 'good afternoon', 'good evening', 'howdy']
    if any(query_lower.startswith(g) or query_lower == g for g in greetings):
        return 'greeting'

    # Help patterns
    help_patterns = ['help', 'what can you', 'how do i', 'how to', 'guide']
    if any(h in query_lower for h in help_patterns):
        return 'help'

    # Best/worst comparison
    if any(w in query_lower for w in ['best', 'top', 'highest', 'number one', '#1']):
        return 'best_branch'
    if any(w in query_lower for w in ['worst', 'lowest', 'bottom', 'poorest',
                                       'improvement', 'improve', 'needs work',
                                       'struggling', 'declining', 'weakest',
                                       'behind', 'underperforming', 'weak']):
        return 'worst_branch'

    # Comparison between branches
    if 'compare' in query_lower or 'vs' in query_lower or 'versus' in query_lower:
        return 'compare'

    # General product / topic query (no branch specified)
    topic_triggers = ['what do', 'what are', 'how is the', 'how are the',
                      'tell me about the', 'customers say', 'people say',
                      'feedback on', 'opinion on', 'thoughts on']
    if any(t in query_lower for t in topic_triggers):
        topics = detect_topic(query)
        if topics != ['general']:
            return 'product_query'

    # Branch-specific query
    return 'branch_query'


class ChatbotEngine:
    """Main chatbot engine that processes user queries against review data."""

    def __init__(self, reviews_df):
        self.df = reviews_df
        self.df.columns = self.df.columns.str.strip()
        self.branch_names = self.df['business_name'].dropna().unique().tolist() if 'business_name' in self.df.columns else []
        self.models_loaded = LSTM_AVAILABLE
        self.gemini_loaded = GEMINI_AVAILABLE

    def process_message(self, message, context=None):
        """Process a user message and return a chatbot response."""
        context = context or {}
        active_branch = context.get('active_branch')

        intent = detect_intent(message)
        
        # Override intent if user is asking how to improve a specific branch
        branch_name = find_matching_branch(message, self.branch_names)
        
        # Handle pronoun references to the active branch in context
        if not branch_name and active_branch:
            pronouns = ['this branch', 'this location', 'it', 'here', 'that branch', 'this cafe', 'the branch', 'this', 'there']
            if any(p in message.lower() for p in pronouns) or len(message.split()) < 5:
                branch_name = active_branch

        improve_keywords = ['improve', 'better', 'fix', 'suggestion', 'wrong with', 'needs work', 'issue', 'bad']
        if branch_name and any(word in message.lower() for word in improve_keywords):
            return self._improve_branch_response(message, branch_name)

        if intent == 'greeting':
            return self._greeting_response()
        elif intent == 'help':
            return self._help_response()
        elif intent == 'best_branch':
            return self._best_branch_response(message)
        elif intent == 'worst_branch':
            return self._worst_branch_response(message)
        elif intent == 'compare':
            return self._compare_response(message)
        elif intent == 'product_query':
            topics = detect_topic(message)
            if branch_name:
                return self._branch_query_response(message, branch_name)
            else:
                return self._general_topic_response(message, topics)
        else:
            return self._branch_query_response(message, branch_name)

    def _greeting_response(self):
        model_status = 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
        return {
            'type': 'greeting',
            'message': "Hello! 👋 I'm your Barista Coffee Chain AI assistant. I can help you understand customer sentiment and reviews for any branch. Try asking me things like:",
            'suggestions': [
                "How is Barista Wattala?",
                "What do people say about the coffee?",
                "Which branch has the best reviews?",
                "Tell me about food quality at Barista Colombo"
            ],
            'model_status': model_status
        }

    def _help_response(self):
        return {
            'type': 'help',
            'message': "Here's what I can do for you:",
            'capabilities': [
                "🏪 **Branch Analysis** — Ask about any specific branch to get sentiment breakdown",
                "🍕 **Product Feedback** — Find out what customers say about specific products (coffee, food, etc.)",
                "⭐ **Best/Worst Branch** — Discover top-performing or struggling branches",
                "📊 **Aspect Analysis** — Get ratings for food, service, atmosphere, and price",
                "🔍 **Compare Branches** — Compare two branches side by side"
            ],
            'suggestions': [
                "Tell me about Barista Wattala",
                "Which branch has the best reviews?",
                "How is the coffee quality?",
                "Compare branches"
            ]
        }

    def _best_branch_response(self, query):
        topics = detect_topic(query)
        df = self.df

        branch_stats = []
        for name, group in df.groupby('business_name'):
            avg_rating = group['review_rating'].mean() if 'review_rating' in group.columns else 0
            avg_sentiment = group['sentiment_score'].mean() if 'sentiment_score' in group.columns else 0
            total = len(group)
            branch_stats.append({
                'branch_name': str(name),
                'avg_rating': round(float(avg_rating), 2) if not pd.isna(avg_rating) else 0,
                'avg_sentiment': round(float(avg_sentiment), 4) if not pd.isna(avg_sentiment) else 0,
                'total_reviews': total,
                'city': str(group['city'].iloc[0]) if 'city' in group.columns and pd.notna(group['city'].iloc[0]) else 'Unknown'
            })

        # Sort by avg_rating descending
        branch_stats.sort(key=lambda x: x['avg_rating'], reverse=True)
        top_branches = branch_stats[:5]

        summary = f"Here are the **top {len(top_branches)} best-rated branches** based on customer reviews:"

        # Try to generate a natural summary
        if self.gemini_loaded and top_branches:
            branch_summaries = ', '.join([
                '{} ({} stars, {} reviews)'.format(b['branch_name'], b['avg_rating'], b['total_reviews'])
                for b in top_branches[:3]
            ])
            prompt = (
                f"A customer is asking: '{query}'.\n"
                f"Answer their question specifically based on the following data about our top coffee shop branches:\n"
                f"- Top branches: {branch_summaries}\n"
                f"Write a helpful, conversational 2-sentence response that directly answers their question using this data."
            )
            generated = generate_response(prompt)
            if generated == "API Limit reached":
                summary = "API Limit reached"
            elif generated:
                summary = generated

        return {
            'type': 'best_branch',
            'message': summary,
            'branches': top_branches,
            'model_used': 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
        }

    def _worst_branch_response(self, query):
        df = self.df
        branch_stats = []
        for name, group in df.groupby('business_name'):
            avg_rating = group['review_rating'].mean() if 'review_rating' in group.columns else 0
            avg_sentiment = group['sentiment_score'].mean() if 'sentiment_score' in group.columns else 0
            total = len(group)
            branch_stats.append({
                'branch_name': str(name),
                'avg_rating': round(float(avg_rating), 2) if not pd.isna(avg_rating) else 0,
                'avg_sentiment': round(float(avg_sentiment), 4) if not pd.isna(avg_sentiment) else 0,
                'total_reviews': total,
                'city': str(group['city'].iloc[0]) if 'city' in group.columns and pd.notna(group['city'].iloc[0]) else 'Unknown'
            })

        branch_stats.sort(key=lambda x: x['avg_rating'])
        bottom_branches = branch_stats[:5]

        summary = f"Here are the **{len(bottom_branches)} branches that need the most improvement** based on customer reviews:"
        
        if self.gemini_loaded:
            branch_strings = [f"{b['branch_name']} ({b['avg_rating']} stars)" for b in bottom_branches[:3]]
            prompt = (
                f"A customer is asking: '{query}'.\n"
                f"Answer their question specifically based on the following data about branches needing the most improvement:\n"
                f"- Lowest rated branches: {', '.join(branch_strings)}\n"
                f"Write a professional, conversational 2-sentence response that directly answers their question using this data."
            )
            generated = generate_response(prompt)
            if generated == "API Limit reached":
                summary = "API Limit reached"
            elif generated:
                summary = generated

        return {
            'type': 'worst_branch',
            'message': summary,
            'branches': bottom_branches,
            'model_used': 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
        }

    def _branch_query_response(self, query, branch_name=None):
        """Handle a query about a specific branch."""
        if not branch_name:
            branch_name = find_matching_branch(query, self.branch_names)
        topics = detect_topic(query)

        if not branch_name:
            # No branch found — try general topic search across all branches
            return self._general_topic_response(query, topics)

        branch_df = self.df[self.df['business_name'] == branch_name]
        if branch_df.empty:
            return {
                'type': 'not_found',
                'message': f"I couldn't find any reviews for that branch. Here are the available branches:",
                'suggestions': self.branch_names[:10]
            }

        return self._analyze_branch(branch_name, branch_df, topics, query)

    def _analyze_branch(self, branch_name, branch_df, topics, query):
        """Deep analysis of a branch's reviews."""
        total_reviews = len(branch_df)

        # ---- Per-review sentiment using LSTM model ----
        review_texts = branch_df['review_text'].dropna().tolist() if 'review_text' in branch_df.columns else []
        clean_texts = branch_df['clean_review_text'].dropna().tolist() if 'clean_review_text' in branch_df.columns else review_texts

        sentiments = []
        sentiment_details = []
        for text in clean_texts[:50]:  # Limit for performance
            if isinstance(text, str) and len(text.strip()) > 0:
                sent, score = classify_sentiment_lstm(text)
                sentiments.append(sent)
                sentiment_details.append({'text': text[:150], 'sentiment': sent, 'score': score})

        pos_count = sentiments.count('positive')
        neg_count = sentiments.count('negative')
        neu_count = sentiments.count('neutral')
        analyzed_total = len(sentiments)

        # ---- Aspect scores from CSV ----
        aspects = {}
        aspect_cols = {
            'food': 'detailed_food_rating',
            'service': 'detailed_service_rating',
            'atmosphere': 'detailed_atmosphere_rating',
            'price': 'price_numeric_avg'
        }
        for aspect, col in aspect_cols.items():
            if col in branch_df.columns:
                vals = branch_df[col].dropna()
                if len(vals) > 0:
                    aspects[aspect] = round(float(vals.mean()), 2)

        # ---- Product mentions ----
        product_mentions = extract_products_from_reviews(clean_texts, sentiments)

        # ---- Average rating ----
        avg_rating = round(float(branch_df['review_rating'].mean()), 2) if 'review_rating' in branch_df.columns else None
        city = str(branch_df['city'].iloc[0]) if 'city' in branch_df.columns and pd.notna(branch_df['city'].iloc[0]) else 'Unknown'

        # ---- Sample reviews (positive and negative) ----
        positive_samples = [d for d in sentiment_details if d['sentiment'] == 'positive'][:3]
        negative_samples = [d for d in sentiment_details if d['sentiment'] == 'negative'][:3]

        # ---- Build natural language summary ----
        pos_pct = round(pos_count / analyzed_total * 100, 1) if analyzed_total > 0 else 0
        neg_pct = round(neg_count / analyzed_total * 100, 1) if analyzed_total > 0 else 0

        # Try Flan-T5 or Gemini for a natural summary
        summary = None
        prompt = (
            f"A customer is asking: '{query}'.\n"
            f"Answer their question specifically based on the following data for {branch_name} coffee shop in {city}:\n"
            f"- Contains {total_reviews} total reviews with an average rating of {avg_rating}/5.\n"
            f"- Sentiment splits: {pos_pct}% positive and {neg_pct}% negative reviews.\n"
            f"- {'Food score: ' + str(aspects.get('food', 'N/A')) + '/5. ' if 'food' in aspects else ''}\n"
            f"- {'Service score: ' + str(aspects.get('service', 'N/A')) + '/5. ' if 'service' in aspects else ''}\n"
            f"- {'Atmosphere score: ' + str(aspects.get('atmosphere', 'N/A')) + '/5. ' if 'atmosphere' in aspects else ''}\n"
            f"Write a helpful, conversational 2-3 sentence response that directly answers their question using only this data."
        )
        
        # We modified generate_response to prefer gemini automatically
        generated_summary = generate_response(prompt)

        if generated_summary == "API Limit reached":
            summary = "API Limit reached"
        elif generated_summary:
            summary = generated_summary
        
        if not summary:
            overall = 'mostly positive' if pos_pct > 60 else ('mixed' if pos_pct > 35 else 'mostly negative')
            summary = (
                f"**{branch_name}** in {city} has **{total_reviews} reviews** with an average rating of "
                f"**{avg_rating}/5**. Overall customer sentiment is **{overall}** — "
                f"{pos_pct}% positive, {neg_pct}% negative."
            )

        # Build product summary based on topic
        product_insights = []
        for product, stats in product_mentions:
            dominant = max(stats, key=lambda k: stats[k] if k != 'total' else 0)
            if dominant == 'total':
                dominant = 'neutral'
            product_insights.append({
                'product': product.title(),
                'mentions': stats['total'],
                'sentiment': dominant,
                'positive': stats['positive'],
                'negative': stats['negative'],
                'neutral': stats['neutral']
            })

        return {
            'type': 'branch_analysis',
            'message': summary,
            'branch': {
                'name': branch_name,
                'city': city,
                'total_reviews': total_reviews,
                'avg_rating': avg_rating,
            },
            'sentiment': {
                'positive': pos_count,
                'negative': neg_count,
                'neutral': neu_count,
                'positive_pct': pos_pct,
                'negative_pct': neg_pct,
                'analyzed': analyzed_total
            },
            'aspects': aspects,
            'products': product_insights[:8],
            'sample_reviews': {
                'positive': positive_samples,
                'negative': negative_samples
            },
            'model_used': 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
        }

    def _improve_branch_response(self, query, branch_name):
        """Generate improvement suggestions for a specific branch based on negative reviews."""
        branch_df = self.df[self.df['business_name'] == branch_name]
        if branch_df.empty:
            return {
                'type': 'not_found',
                'message': f"I couldn't find any reviews for {branch_name} to base improvements on.",
                'suggestions': self.branch_names[:5]
            }

        # Focus on negative reviews
        clean_texts = branch_df['clean_review_text'].dropna().tolist() if 'clean_review_text' in branch_df.columns else branch_df['review_text'].dropna().tolist()
        
        negative_reviews = []
        for text in clean_texts:
            if isinstance(text, str) and len(text.strip()) > 0:
                sent, _ = classify_sentiment_lstm(text)
                if sent == 'negative' or sent == 'neutral':
                    negative_reviews.append(text)
            if len(negative_reviews) >= 25: 
                break

        if not negative_reviews:
            return {
                'type': 'improve_branch',
                'message': f"**{branch_name}** is doing great! I couldn't find enough negative feedback to suggest major improvements.",
                'model_used': 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
            }

        # Dynamic fallback based on ACTUAL reviews to prove we read the dataset
        samples = [f'"{r[:80]}..."' for r in negative_reviews[:2]]
        summary = f"Here is what needs improvement at **{branch_name}**. Recent customer feedback mentions issues like: {', '.join(samples)}."
        
        if self.gemini_loaded:
            # Join top negative reviews
            reviews_text = " | ".join([r[:150] for r in negative_reviews[:15]])
            prompt = (
                f"A customer is asking: '{query}'.\n"
                f"Answer their question specifically by providing 3 highly actionable bullet points on how {branch_name} can improve, based ONLY on these real customer reviews: {reviews_text}\n"
                f"Keep it professional but conversational, and directly address their specific question."
            )
            generated = generate_response(prompt)
            if generated == "API Limit reached":
                summary = "API Limit reached"
            elif generated:
                summary = f"Based on recent customer feedback for **{branch_name}**, here are some areas for improvement:\n\n{generated}"

        return {
            'type': 'improve_branch',
            'message': summary,
            'branch': {'name': branch_name},
            'model_used': 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
        }

    def _general_topic_response(self, query, topics):
        """Handle queries not about a specific branch."""
        df = self.df

        # Check if there's a recognizable branch name partially
        # If not, give overall insights
        total_reviews = len(df)

        if 'food' in topics or 'general' in topics:
            review_texts = df['clean_review_text'].dropna().tolist() if 'clean_review_text' in df.columns else []
            sentiments_list = []
            for text in review_texts[:100]:
                if isinstance(text, str) and len(text.strip()) > 0:
                    sent, _ = classify_sentiment_lstm(text)
                    sentiments_list.append(sent)

            product_mentions = extract_products_from_reviews(review_texts[:100], sentiments_list)
            product_insights = []
            for product, stats in product_mentions:
                dominant = max(['positive', 'negative', 'neutral'], key=lambda k: stats[k])
                product_insights.append({
                    'product': product.title(),
                    'mentions': stats['total'],
                    'sentiment': dominant,
                    'positive': stats['positive'],
                    'negative': stats['negative'],
                    'neutral': stats['neutral']
                })

            summary = f"Here's a product sentiment analysis across **all {total_reviews} reviews** in the chain:"
            
            if self.gemini_loaded:
                product_strings = [f"{p['product']} ({p['sentiment']})" for p in product_insights[:5]]
                prompt = (
                    f"A customer is asking: '{query}'.\n"
                    f"Answer their question specifically based on the following product sentiment data across all our coffee shops:\n"
                    f"- Popular items and sentiment: {', '.join(product_strings)}\n"
                    f"Write a helpful, conversational 2-sentence response that directly answers their question using this data."
                )
                generated = generate_response(prompt)
                if generated == "API Limit reached":
                    summary = "API Limit reached"
                elif generated:
                    summary = generated

            return {
                'type': 'general_analysis',
                'message': summary,
                'products': product_insights[:10],
                'suggestions': [f"Tell me about {name}" for name in self.branch_names[:5]],
                'model_used': 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
            }

        return {
            'type': 'not_found',
            'message': "I couldn't identify a specific branch in your question. Please try including a branch name, or ask one of these:",
            'suggestions': [
                f"Tell me about {self.branch_names[0]}" if self.branch_names else "List all branches",
                "Which branch has the best reviews?",
                "What do customers say about coffee?",
                "Which branch needs improvement?"
            ]
        }

    def _compare_response(self, query):
        """Compare branches."""
        # Find multiple branch names
        matches = []
        for name in self.branch_names:
            if name.lower() in query.lower():
                matches.append(name)

        if len(matches) < 2:
            # Just show top vs bottom
            branch_stats = []
            for name, group in self.df.groupby('business_name'):
                avg_rating = group['review_rating'].mean() if 'review_rating' in group.columns else 0
                branch_stats.append({
                    'branch_name': str(name),
                    'avg_rating': round(float(avg_rating), 2) if not pd.isna(avg_rating) else 0,
                    'total_reviews': len(group)
                })
            branch_stats.sort(key=lambda x: x['avg_rating'], reverse=True)

            return {
                'type': 'compare',
                'message': "Here's a comparison of all branches by rating:",
                'branches': branch_stats[:10],
                'model_used': 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
            }

        # Compare specific branches
        comparison = []
        for name in matches[:3]:
            branch_df = self.df[self.df['business_name'] == name]
            avg_rating = branch_df['review_rating'].mean() if 'review_rating' in branch_df.columns else 0
            avg_sentiment = branch_df['sentiment_score'].mean() if 'sentiment_score' in branch_df.columns else 0
            comparison.append({
                'branch_name': name,
                'avg_rating': round(float(avg_rating), 2) if not pd.isna(avg_rating) else 0,
                'avg_sentiment': round(float(avg_sentiment), 4) if not pd.isna(avg_sentiment) else 0,
                'total_reviews': len(branch_df)
            })

        return {
            'type': 'compare',
            'message': f"Here's a comparison between {' and '.join(matches[:3])}:",
            'branches': comparison,
            'model_used': 'gemini' if self.gemini_loaded else ('lstm' if self.models_loaded else 'keyword-based')
        }
