<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    // On ajoute is_group et name au fillable
    protected $fillable = ['user_one_id', 'user_two_id', 'is_group', 'name'];

    public function userOne() {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo() {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function messages() {
        return $this->hasMany(Message::class);
    }

    // Nouvelle relation pour récupérer tous les membres d'un groupe
    public function participants() {
        return $this->belongsToMany(User::class, 'conversation_user');
    }
}