<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Conversation;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat.{conversationId}', function ($user, $conversationId) {
    $conversation = \App\Models\Conversation::find($conversationId);
    if (!$conversation) return false;

    // Si c'est un groupe, on vérifie si l'utilisateur est dans la liste des participants
    if ($conversation->is_group) {
        return $conversation->participants->contains('id', $user->id);
    }

    // Sinon, logique 1v1 classique
    return (int) $user->id === (int) $conversation->user_one_id || (int) $user->id === (int) $conversation->user_two_id;
});

Broadcast::channel('online', function ($user) {
    // Si l'utilisateur est authentifié, on retourne ses données publiques
    return ['id' => $user->id, 'name' => $user->name];
});