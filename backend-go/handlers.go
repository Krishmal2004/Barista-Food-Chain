package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

func createReviewHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var rev Review
	if err := json.NewDecoder(r.Body).Decode(&rev); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Debug log — shows exactly what data is received
	log.Printf("Received review: %+v", rev)

	// Basic validation
	if rev.BranchID == "" {
		http.Error(w, "branch_id (location) is required", http.StatusBadRequest)
		return
	}
	if rev.ReviewText == "" {
		http.Error(w, "review_text is required", http.StatusBadRequest)
		return
	}
	if rev.Rating < 1 || rev.Rating > 5 {
		http.Error(w, "rating must be between 1 and 5", http.StatusBadRequest)
		return
	}

	// Default sentiment if empty
	if rev.Sentiment == "" {
		rev.Sentiment = "neutral"
	}

	query := `
		INSERT INTO qr_reviews (branch_id, user_name, user_email, rating, review_text, sentiment, sentiment_confidence, platform)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'web')
		RETURNING id`

	var newID string
	err := dbPool.QueryRow(context.Background(), query,
		rev.BranchID,
		rev.UserName,
		rev.UserEmail,
		rev.Rating,
		rev.ReviewText,
		rev.Sentiment,
		rev.SentimentConfidence,
	).Scan(&newID)

	if err != nil {
		// Shows the EXACT database error in terminal
		log.Printf("Database error: %v", err)
		http.Error(w, fmt.Sprintf("Database error: %v", err), http.StatusInternalServerError)
		return
	}

	log.Printf("Review saved with ID: %s", newID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"id":      newID,
		"message": "Review saved!",
	})
}