<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Notre compte de test principal
        User::factory()->create([
            'name' => 'John Doe',
            'email' => 'test@example.com',
            'password' => Hash::make('password'),
        ]);

        // 5 autres utilisateurs pour simuler des contacts WhatsApp
        User::factory()->create(['name' => 'Alice Smith', 'email' => 'alice@example.com']);
        User::factory()->create(['name' => 'Bob Johnson', 'email' => 'bob@example.com']);
        User::factory()->create(['name' => 'Charlie Brown', 'email' => 'charlie@example.com']);
        User::factory()->create(['name' => 'David Miller', 'email' => 'david@example.com']);
        User::factory()->create(['name' => 'Emma Watson', 'email' => 'emma@example.com']);
    }
}