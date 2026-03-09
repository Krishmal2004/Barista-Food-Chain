package main

import "time"

type Review struct {
	ID                  string    `json:"id"`
	BranchID            string    `json:"location"`
	UserName            string    `json:"customerName"`
	UserEmail           string    `json:"userEmail"`
	Rating              int       `json:"rating"`
	ReviewText          string    `json:"reviewText"`
	Sentiment           string    `json:"sentiment"`
	SentimentConfidence float64   `json:"sentiment_confidence"`
	Likes               int       `json:"likes"`
	Comments            int       `json:"comments"`
	CreatedAt           time.Time `json:"submittedAt"`
}