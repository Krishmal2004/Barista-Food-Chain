# BARISTA REVIEWS PROJECT - FULL NOTEBOOK
# Group members and responsibilities:
# Member 1   IT24103866     Dataset Preparation / Structuring
# Member 2   IT24102699    Data Cleaning + Preprocessing
# Member 3   IT241101666   EDA + Visualizations (main charts)
# Member 4   IT2410100574  EDA + Visualizations (supporting plots)
# Member 5   IT24102308   Sentiment Analysis + Model Selection + LSTM
# Member 6   IT24104109    Aspect Identification + Final Insights

# ─── Member 1 - IT24103866 ───
# Loading and basic structuring of the dataset

import pandas as pd

file_locations = [
    'Barista Reviews raw data file.xlsx',
    '/content/Barista Reviews raw data file.xlsx',
    '/kaggle/input/barista/Barista Reviews raw data file.xlsx',
    'reviews.xlsx',
    'barista_data.xlsx'
]

df = pd.DataFrame()
file_found = False

for path in file_locations:
    try:
        df = pd.read_excel(path, engine='openpyxl')
        file_found = True
        break
    except:
        pass

if not file_found:
    print("Could not find the Excel file. Please upload it and update the path.")
else:
    # Rename columns based on available source columns
    rename_map = {}
    if 'title' in df.columns:
        rename_map['title'] = 'business_name'
    if 'text' in df.columns:
        rename_map['text'] = 'review_text'
    if 'stars' in df.columns:
        rename_map['stars'] = 'stars'
    if 'name' in df.columns:
        rename_map['name'] = 'reviewer_name'
    if 'publishedAtDate' in df.columns:
        rename_map['publishedAtDate'] = 'review_date'
    if 'totalScore' in df.columns:
        rename_map['totalScore'] = 'avg_rating'
    if 'reviewsCount' in df.columns:
        rename_map['reviewsCount'] = 'review_count'

    df = df.rename(columns=rename_map)
    df = df.loc[:, ~df.columns.duplicated()].copy()

    keep_columns = ['business_name', 'stars', 'review_text', 'review_date',
                    'reviewer_name', 'avg_rating', 'review_count']
    df = df[[c for c in keep_columns if c in df.columns]].copy()

    print("Dataset shape:", df.shape)
    print("Columns:", list(df.columns))
    print("\nFirst 3 rows:")
    print(df.head(3))

# ─── Member 2 - IT24102699 ───
# Data cleaning and preprocessing

import re

def clean_review(text):
    if not isinstance(text, str) or not text.strip():
        return ""
    text = text.lower()
    text = re.sub(r'http\S+|www\S+|@\S+|#\S+', '', text)
    text = re.sub(r'[^a-z\s]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

if 'review_text' in df.columns:
    df['clean_review'] = df['review_text'].apply(clean_review)
    df['review_length'] = df['clean_review'].str.len()

    print("Review length statistics:")
    print(df['review_length'].describe().round(1))

    print("\nBefore vs After cleaning (first 5 non-empty rows):")
    print(df[df['clean_review'].str.strip() != ''][['review_text', 'clean_review']].head(5))
else:
    print("'review_text' column not found.")

# ─── Member 3 & 4 - EDA and visualizations ───

import matplotlib.pyplot as plt
import seaborn as sns

plt.style.use('seaborn-v0_8-whitegrid')

# Star rating distribution
plt.figure(figsize=(8, 5))
sns.countplot(x='stars', data=df)
plt.title("Distribution of Star Ratings")
plt.xlabel("Stars")
plt.ylabel("Count")
plt.show()

# Reviews per branch (top 10)
if 'business_name' in df.columns:
    branch_counts = df['business_name'].value_counts().head(10)
    plt.figure(figsize=(10, 6))
    branch_counts.plot(kind='bar')
    plt.title("Top 10 Branches by Review Count")
    plt.ylabel("Number of Reviews")
    plt.xticks(rotation=45, ha='right')
    plt.tight_layout()
    plt.show()

# Average rating per branch
if 'business_name' in df.columns:
    avg_rating = df.groupby('business_name')['stars'].mean().sort_values(ascending=False)
    plt.figure(figsize=(10, 6))
    avg_rating.plot(kind='barh')
    plt.title("Average Star Rating per Branch")
    plt.xlabel("Average Stars")
    plt.tight_layout()
    plt.show()

# ─── Member 5 - Sentiment analysis + LSTM ───

from textblob import TextBlob
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from sklearn.metrics import accuracy_score

# TextBlob sentiment
def textblob_sentiment(text):
    if not isinstance(text, str) or not text.strip():
        return 'Neutral'
    polarity = TextBlob(text).sentiment.polarity
    if polarity > 0.10:
        return 'Positive'
    if polarity < -0.08:
        return 'Negative'
    return 'Neutral'

df['sentiment_textblob'] = df['clean_review'].apply(textblob_sentiment)

# VADER sentiment (applied to raw text - better for VADER)
nltk.download('vader_lexicon', quiet=True)
vader = SentimentIntensityAnalyzer()

def vader_sentiment(text):
    if not isinstance(text, str) or not text.strip():
        return 'Neutral'
    compound = vader.polarity_scores(text)['compound']
    if compound >= 0.05:
        return 'Positive'
    if compound <= -0.05:
        return 'Negative'
    return 'Neutral'

df['sentiment_vader'] = df['review_text'].apply(vader_sentiment)

# Compare with star ratings (proxy labels)
df['star_label'] = df['stars'].map({
    1: 'Negative', 2: 'Negative',
    3: 'Neutral',
    4: 'Positive', 5: 'Positive'
})

valid_rows = df.dropna(subset=['star_label'])

print("\nModel agreement with star ratings:")
for col, name in [('sentiment_textblob', 'TextBlob'), ('sentiment_vader', 'VADER')]:
    acc = accuracy_score(valid_rows['star_label'], valid_rows[col])
    print(f"{name:10} : {acc:.3f}")

# Select rule-based final sentiment (for aspects)
df['final_sentiment'] = df['sentiment_vader']
print("Using VADER as rule-based final sentiment.")

#  LSTM Deep Learning Model

print("\n=== Preparing data for LSTM training ===")

# Create numerical labels
label_map = {'Negative': 0, 'Neutral': 1, 'Positive': 2}
df['label_num'] = df['star_label'].map(label_map)

# Keep only rows suitable for supervised training
trainable = df.dropna(subset=['label_num', 'clean_review']).copy()
trainable = trainable[trainable['clean_review'].str.strip() != '']

print(f"Usable rows for training: {len(trainable):,} / {len(df):,}")

if len(trainable) < 300:
    print("⚠️ Too few labeled examples — LSTM may not learn well.")
else:
    from sklearn.model_selection import train_test_split
    from tensorflow.keras.preprocessing.text import Tokenizer
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout, SpatialDropout1D
    from tensorflow.keras.optimizers import Adam
    import numpy as np

    # Hyperparameters
    MAX_WORDS     = 8000
    MAX_LEN       = 120
    EMBEDDING_DIM = 100
    BATCH_SIZE    = 32
    EPOCHS        = 12
    TEST_SIZE     = 0.25

    # Split
    X = trainable['clean_review'].values
    y = trainable['label_num'].values.astype('int')

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=42, stratify=y
    )

    print(f"Train samples: {len(X_train):,}   Test samples: {len(X_test):,}")

    # Tokenize & pad
    tokenizer = Tokenizer(num_words=MAX_WORDS, oov_token="<OOV>")
    tokenizer.fit_on_texts(X_train)

    X_train_seq = tokenizer.texts_to_sequences(X_train)
    X_test_seq  = tokenizer.texts_to_sequences(X_test)

    X_train_pad = pad_sequences(X_train_seq, maxlen=MAX_LEN, padding='post', truncating='post')
    X_test_pad  = pad_sequences(X_test_seq,  maxlen=MAX_LEN, padding='post', truncating='post')

    # Build model
    model = Sequential()
    model.add(Embedding(MAX_WORDS, EMBEDDING_DIM, input_length=MAX_LEN))
    model.add(SpatialDropout1D(0.3))
    model.add(LSTM(128, dropout=0.3, recurrent_dropout=0.2))
    model.add(Dense(64, activation='relu'))
    model.add(Dropout(0.3))
    model.add(Dense(3, activation='softmax'))

    model.compile(
        loss='sparse_categorical_crossentropy',
        optimizer=Adam(learning_rate=0.001),
        metrics=['accuracy']
    )

    model.summary()

    # Train
    print("\nTraining LSTM...")
    history = model.fit(
        X_train_pad, y_train,
        validation_split=0.15,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        verbose=1
    )

    # Evaluate
    print("\nEvaluating on test set...")
    loss, acc_lstm = model.evaluate(X_test_pad, y_test, verbose=0)
    print(f"LSTM Test Accuracy: {acc_lstm:.4f} ({acc_lstm*100:.2f}%)")

    # Plot training history
    plt.figure(figsize=(10,4))
    plt.subplot(1,2,1)
    plt.plot(history.history['accuracy'], label='train acc')
    plt.plot(history.history['val_accuracy'], label='val acc')
    plt.title('Accuracy')
    plt.legend()
    plt.subplot(1,2,2)
    plt.plot(history.history['loss'], label='train loss')
    plt.plot(history.history['val_loss'], label='val loss')
    plt.title('Loss')
    plt.legend()
    plt.tight_layout()
    plt.show()

    # Compare with VADER
    vader_acc = accuracy_score(valid_rows['star_label'], valid_rows['sentiment_vader'])
    print("\nFinal comparison:")
    print(f"VADER agreement with stars : {vader_acc:.4f}")
    print(f"LSTM test accuracy          : {acc_lstm:.4f}")
    if acc_lstm > vader_acc:
        print("→ LSTM outperforms VADER!")
    else:
        print("→ VADER remains competitive (LSTM may need tuning / more data).")

    # Save the trained LSTM model
    model_output_filename = "lstm_sentiment_model.keras"
    try:
        model.save(model_output_filename)
        print(f"\nLSTM model saved as: {model_output_filename}")
    except Exception as e:
        print(f"\nCould not save LSTM model: {e}")

# ─── Member 6 - Aspect identification and final insights ───

aspect_keywords = {
    'Food_Drink':   ['taste', 'flavor', 'coffee', 'latte', 'cappuccino', 'delicious', 'bitter', 'hot', 'cold', 'fresh'],
    'Service':      ['staff', 'barista', 'friendly', 'slow', 'fast', 'service', 'helpful', 'rude'],
    'Atmosphere':   ['cozy', 'noisy', 'quiet', 'clean', 'ambience', 'comfortable', 'vibe'],
    'Price':        ['expensive', 'cheap', 'price', 'value', 'worth', 'overpriced'],
    'Waiting':      ['wait', 'queue', 'long', 'quick', 'time'],
    'Location':     ['location', 'parking', 'convenient']
}

def extract_aspects(text):
    text = text.lower()
    matched = []
    for aspect, words in aspect_keywords.items():
        if any(word in text for word in words):
            matched.append(aspect)
    return matched

df['aspects'] = df['clean_review'].apply(extract_aspects)

# Frequency count
all_aspects = [item for sublist in df['aspects'] for item in sublist]
aspect_counts = pd.Series(all_aspects).value_counts()

print("\nTop aspects by mention count:")
print(aspect_counts.head(8))

# Plot top aspects
plt.figure(figsize=(9, 5))
aspect_counts.head(10).plot(kind='bar')
plt.title("Most Frequently Mentioned Aspects")
plt.ylabel("Number of Mentions")
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.show()

# Sentiment per aspect
if 'final_sentiment' in df.columns:
    exploded = df.explode('aspects').dropna(subset=['aspects'])
    aspect_sentiment = pd.crosstab(
        exploded['aspects'],
        exploded['final_sentiment'],
        normalize='index'
    ).mul(100).round(1)

    print("\nSentiment distribution per aspect (%):")
    print(aspect_sentiment)

    aspect_sentiment.plot(kind='bar', stacked=True, figsize=(10, 6))
    plt.title("Sentiment Distribution by Aspect (%)")
    plt.ylabel("Percentage")
    plt.xticks(rotation=45, ha='right')
    plt.legend(title='Sentiment', bbox_to_anchor=(1.02, 1), loc='upper left')
    plt.tight_layout()
    plt.show()

# ─── FINAL STEP - Save processed dataset ───

output_filename = "barista_reviews_processed_final_with_lstm.xlsx"

columns_to_save = [
    'business_name', 'stars', 'review_text', 'review_date',
    'reviewer_name', 'avg_rating', 'review_count',
    'clean_review', 'review_length',
    'sentiment_textblob', 'sentiment_vader',
    'final_sentiment', 'aspects',
    'label_num'                     # added for reference
]

existing_columns = [col for col in columns_to_save if col in df.columns]

try:
    df[existing_columns].to_excel(output_filename, index=False, engine='openpyxl')
    print(f"\nProcessed dataset saved as: {output_filename}")
    print(f"Rows: {len(df):,}")
    print(f"Columns saved: {len(existing_columns)}")
except Exception as e:
    print("\nCould not save Excel file:", str(e))
    csv_name = "barista_reviews_processed_final_with_lstm.csv"
    df.to_csv(csv_name, index=False, encoding='utf-8-sig')
    print(f"Fallback: saved as {csv_name}")

import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd

if 'final_sentiment' in df.columns:
    # Ensure 'aspects' column is a list of strings and exploded
    df_copy = df.copy()
    df_copy['aspects'] = df_copy['aspects'].apply(lambda x: x if isinstance(x, list) else [])
    exploded_all = df_copy.explode('aspects').dropna(subset=['aspects'])

    # Get unique branch names
    unique_branches = exploded_all['business_name'].unique()

    print(f"Generating aspect sentiment plots for {len(unique_branches)} branches...")

    for branch_name in unique_branches:
        branch_data = exploded_all[exploded_all['business_name'] == branch_name]

        if not branch_data.empty and not branch_data['aspects'].isnull().all():
            aspect_sentiment_branch = pd.crosstab(
                branch_data['aspects'],
                branch_data['final_sentiment'],
                normalize='index'
            ).mul(100).round(1)

            for sentiment_cat in ['Negative', 'Neutral', 'Positive']:
                if sentiment_cat not in aspect_sentiment_branch.columns:
                    aspect_sentiment_branch[sentiment_cat] = 0.0
            aspect_sentiment_branch = aspect_sentiment_branch[['Negative', 'Neutral', 'Positive']]

            if not aspect_sentiment_branch.empty:
                plt.figure(figsize=(10, 6))
                aspect_sentiment_branch.plot(kind='bar', stacked=True, figsize=(10, 6))
                plt.title(f"Sentiment Distribution by Aspect for {branch_name}")
                plt.ylabel("Percentage")
                plt.xticks(rotation=45, ha='right')
                plt.legend(title='Sentiment', bbox_to_anchor=(1.02, 1), loc='upper left')
                plt.tight_layout()
                plt.show()
            else:
                print(f"No meaningful aspect data for branch: {branch_name}")
        else:
            print(f"No reviews with aspects for branch: {branch_name}")
else:
    print("'final_sentiment' column not found in DataFrame.")

