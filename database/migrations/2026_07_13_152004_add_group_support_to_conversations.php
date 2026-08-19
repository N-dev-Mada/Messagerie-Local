<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // On ajoute les colonnes nécessaires aux conversations
        Schema::table('conversations', function (Blueprint $table) {
            $table->boolean('is_group')->default(false);
            $table->string('name')->nullable();
        });

        // On crée la table pivot pour les membres du groupe
        Schema::create('conversation_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_user');
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['is_group', 'name']);
        });
    }
};