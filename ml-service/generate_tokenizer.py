import pandas as pd
from keras_preprocessing.text import Tokenizer
import pickle
import os

print("Loading data...")
# Read the processed dataset
try:
    df = pd.read_excel('barista_reviews_processed_final_with_lstm.xlsx', engine='openpyxl')
except Exception as e:
    print("Could not load excel, trying csv:", e)
    df = pd.read_csv('barista_reviews_processed_final_with_lstm.csv')

# Drop empty cleaned reviews
trainable = df.dropna(subset=['clean_review']).copy()
trainable = trainable[trainable['clean_review'].str.strip() != '']

X = trainable['clean_review'].values

# Parameters from notebook
MAX_WORDS = 8000

print(f"Fitting tokenizer on {len(X)} reviews...")
tokenizer = Tokenizer(num_words=MAX_WORDS, oov_token="<OOV>")
tokenizer.fit_on_texts(X)

print("Saving tokenizer...")
with open('tokenizer.pickle', 'wb') as f:
    pickle.dump(tokenizer, f, protocol=pickle.HIGHEST_PROTOCOL)

print("tokenizer.pickle saved successfully!")
