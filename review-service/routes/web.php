<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
    return response()->json([
        'service' => 'review-service',
        'language' => 'PHP',
        'framework' => 'Laravel',
        'database' => 'MariaDB',
        'message' => 'Review Service berjalan di dalam Docker'
    ]);
});

Route::get('/health', function () {
    return response()->json([
        'service' => 'review-service',
        'status' => 'running'
    ]);
});

Route::get('/reviews', function () {
    $reviews = DB::table('reviews')
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json([
        'service' => 'review-service',
        'message' => 'Daftar review berhasil diambil',
        'data' => $reviews
    ]);
});

Route::post('/reviews', function (Request $request) {
    $validated = $request->validate([
        'destination_id' => 'required|integer|min:1',
        'user_name' => 'required|string|max:100',
        'rating' => 'required|integer|min:1|max:5',
        'comment' => 'required|string'
    ]);

    $id = DB::table('reviews')->insertGetId([
        'destination_id' => $validated['destination_id'],
        'user_name' => $validated['user_name'],
        'rating' => $validated['rating'],
        'comment' => $validated['comment'],
        'created_at' => now(),
        'updated_at' => now()
    ]);

    $review = DB::table('reviews')->where('id', $id)->first();

    return response()->json([
        'service' => 'review-service',
        'message' => 'Review berhasil ditambahkan',
        'data' => $review
    ], 201);
});

Route::get('/reviews/destination/{destination_id}', function ($destination_id) {
    $reviews = DB::table('reviews')
        ->where('destination_id', $destination_id)
        ->orderBy('created_at', 'desc')
        ->get();

    $averageRating = DB::table('reviews')
        ->where('destination_id', $destination_id)
        ->avg('rating');

    return response()->json([
        'service' => 'review-service',
        'message' => 'Review berdasarkan destinasi berhasil diambil',
        'destination_id' => (int) $destination_id,
        'average_rating' => round($averageRating, 2),
        'total_reviews' => $reviews->count(),
        'data' => $reviews
    ]);
});

Route::get('/reviews/{id}', function ($id) {
    $review = DB::table('reviews')->where('id', $id)->first();

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
});

Route::put('/reviews/{id}', function (Request $request, $id) {
    $review = DB::table('reviews')->where('id', $id)->first();

    if (!$review) {
        return response()->json([
            'service' => 'review-service',
            'message' => 'Review tidak ditemukan'
        ], 404);
    }

    $validated = $request->validate([
        'destination_id' => 'sometimes|required|integer|min:1',
        'user_name' => 'sometimes|required|string|max:100',
        'rating' => 'sometimes|required|integer|min:1|max:5',
        'comment' => 'sometimes|required|string'
    ]);

    $validated['updated_at'] = now();

    DB::table('reviews')
        ->where('id', $id)
        ->update($validated);

    $updatedReview = DB::table('reviews')->where('id', $id)->first();

    return response()->json([
        'service' => 'review-service',
        'message' => 'Review berhasil diperbarui',
        'data' => $updatedReview
    ]);
});

Route::delete('/reviews/{id}', function ($id) {
    $review = DB::table('reviews')->where('id', $id)->first();

    if (!$review) {
        return response()->json([
            'service' => 'review-service',
            'message' => 'Review tidak ditemukan'
        ], 404);
    }

    DB::table('reviews')->where('id', $id)->delete();

    return response()->json([
        'service' => 'review-service',
        'message' => 'Review berhasil dihapus'
    ]);
});

# ppp