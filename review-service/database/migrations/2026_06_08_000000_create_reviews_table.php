<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('destination_id');
                $table->string('user_name', 100);
                $table->unsignedTinyInteger('rating');
                $table->text('comment');
                $table->timestamps();
            });
        }

        if (DB::table('reviews')->count() == 0) {
            DB::table('reviews')->insert([
                [
                    'destination_id' => 1,
                    'user_name' => 'Budi Santoso',
                    'rating' => 5,
                    'comment' => 'Destinasi sangat bagus dan pelayanan memuaskan.',
                    'created_at' => now(),
                    'updated_at' => now()
                ],
                [
                    'destination_id' => 1,
                    'user_name' => 'Siti Aminah',
                    'rating' => 4,
                    'comment' => 'Tempatnya nyaman, hanya saja agak ramai.',
                    'created_at' => now(),
                    'updated_at' => now()
                ],
                [
                    'destination_id' => 2,
                    'user_name' => 'Andi Pratama',
                    'rating' => 5,
                    'comment' => 'Paket wisata sesuai ekspektasi.',
                    'created_at' => now(),
                    'updated_at' => now()
                ]
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};