<?php

namespace App\Http\Controllers;

use App\Models\Review;
use Illuminate\Http\JsonResponse;

class ReviewController extends Controller
{
    public function indexService(): JsonResponse
    {
        return response()->json([
            'service' => 'review-service',
            'language' => 'PHP',
            'framework' => 'Laravel',
            'database' => 'MySQL',
            'message' => 'Review Service berjalan di dalam Docker'
        ]);
    }

    public function health(): JsonResponse
    {
        return response()->json([
            'service' => 'review-service',
            'status' => 'running'
        ]);
    }

    public function getAllReviews(): JsonResponse
    {
        $reviews = Review::orderBy('created_at', 'desc')->get();

        return response()->json([
            'service' => 'review-service',
            'message' => 'Daftar review berhasil diambil',
            'total_reviews' => $reviews->count(),
            'data' => $reviews
        ]);
    }

    public function getReviewById($id): JsonResponse
    {
        $review = Review::find($id);

        if (!$review) {
            return response()->json([
                'service' => 'review-service',
                'message' => 'Review tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'service' => 'review-service',
            'message' => 'Detail review berhasil diambil',
            'data' => $review
        ]);
    }

    public function getReviewsByDestination($destination_id): JsonResponse
    {
        $reviews = Review::where('destination_id', $destination_id)
            ->orderBy('created_at', 'desc')
            ->get();

        $averageRating = Review::where('destination_id', $destination_id)
            ->avg('rating');

        return response()->json([
            'service' => 'review-service',
            'message' => 'Review berdasarkan destinasi berhasil diambil',
            'destination_id' => (int) $destination_id,
            'average_rating' => $averageRating ? round($averageRating, 2) : 0,
            'total_reviews' => $reviews->count(),
            'data' => $reviews
        ]);
    }
}