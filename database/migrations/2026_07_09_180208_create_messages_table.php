<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
{
    Schema::create('messages', function (Blueprint $table) {
        $table->id();
        $table->foreignId('conversation_id')->constrained()->onDelete('cascade');
        $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
        $table->text('body')->nullable(); // Changement : nullable dès le départ !
        $table->string('file_path')->nullable(); // Nouveau champ
        $table->string('file_type')->nullable(); // Nouveau champ
        $table->timestamp('read_at')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
