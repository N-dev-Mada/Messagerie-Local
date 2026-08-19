<?php

namespace App\Livewire;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Livewire\Component;
use Livewire\WithFileUploads;

class ChatComponent extends Component
{
    use WithFileUploads;

    public $file = null;
    public $isCreatingGroup = false;
    public $groupName = '';
    public $selectedParticipants = [];
    public $onlineUsers = [];
    public $conversations = [];
    public $selectedConversationId = null;
    public $messages = [];
    public $newMessageBody = '';
    public $searchQuery = '';
    public $searchResults = [];

    public function toggleGroupMode()
    {
        $this->isCreatingGroup = !$this->isCreatingGroup;
        $this->selectedParticipants = [];
        $this->groupName = '';
        if ($this->isCreatingGroup) {
            $this->searchResults = User::where('id', '!=', auth()->id())->get();
        } else {
            $this->searchResults = [];
        }
    }

    public function createGroup()
    {
        if (empty(trim($this->groupName)) || empty($this->selectedParticipants)) return;

        $conversation = Conversation::create([
            'is_group' => true,
            'name' => trim($this->groupName),
            'user_one_id' => auth()->id(),
            'user_two_id' => auth()->id(), // On utilise l'ID du créateur pour satisfaire la contrainte existante
        ]);

        // On ajoute les membres sélectionnés + le créateur au groupe
        $participants = $this->selectedParticipants;
        $participants[] = auth()->id();
        $conversation->participants()->attach($participants);

        // Reset de l'interface et ouverture du chat
        $this->isCreatingGroup = false;
        $this->groupName = '';
        $this->selectedParticipants = [];
        $this->loadConversations();
        $this->selectConversation($conversation->id);
    }

    public function updateOnlineUsers($users)
    {
        $this->onlineUsers = $users;
    }

    public function mount()
    {
        $this->loadConversations();
    }

    public function loadConversations()
    {
        $this->conversations = Conversation::with(['messages', 'userOne', 'userTwo', 'participants'])
            ->where('user_one_id', auth()->id())
            ->orWhere('user_two_id', auth()->id())
            ->orWhereHas('participants', function($query) {
                $query->where('user_id', auth()->id()); // On charge aussi les groupes
            })
            ->get()
            ->sortByDesc(function ($conversation) {
                return $conversation->messages->last()?->created_at ?? $conversation->created_at;
            })
            ->values()
            ->all();
    }

    public function updatedSearchQuery()
    {
        if (empty($this->searchQuery)) {
            $this->searchResults = [];
            return;
        }

        $this->searchResults = User::where('id', '!=', auth()->id())
            ->where('name', 'like', '%' . $this->searchQuery . '%')
            ->get();
    }

    public function selectConversation($conversationId)
    {
        $this->selectedConversationId = $conversationId;
        $this->selectedConversation = Conversation::find($conversationId);
        
        // Marquer les messages reçus comme "lus"
        Message::where('conversation_id', $conversationId)
            ->where('sender_id', '!=', auth()->id())
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $this->loadMessages();
        $this->loadConversations();
    }

    public function startConversation($userId)
    {
        $authId = auth()->id();
        $userOneId = min($authId, $userId);
        $userTwoId = max($authId, $userId);

        $conversation = Conversation::firstOrCreate([
            'user_one_id' => $userOneId,
            'user_two_id' => $userTwoId,
        ]);

        $this->loadConversations();
        $this->selectConversation($conversation->id);
    }

    public function loadMessages()
    {
        if (!$this->selectedConversationId) return;

        $this->messages = Message::where('conversation_id', $this->selectedConversationId)
            ->with('sender')
            ->orderBy('created_at', 'asc')
            ->get()
            ->toArray();
    }

    public function sendMessage()
{
    // On valide que le message contient du texte OU un fichier
    if (empty(trim($this->newMessageBody)) && !$this->file) {
        return;
    }

    $filePath = null;
    $fileType = null;

    if ($this->file) {
        // Sauvegarde dans le dossier public/attachments
        $filePath = $this->file->store('attachments', 'public');
        $fileType = $this->file->getMimeType();
    }

    $message = Message::create([
        'conversation_id' => $this->selectedConversationId,
        'sender_id' => auth()->id(),
        'body' => trim($this->newMessageBody) ?: null,
        'file_path' => $filePath,
        'file_type' => $fileType,
    ]);

    broadcast(new \App\Events\MessageSent($message))->toOthers();

    $this->newMessageBody = '';
    $this->file = null; // Reset du fichier
    $this->loadMessages();
    $this->loadConversations();
}

    public function render()
    {
        return view('livewire.chat-component', [
            'selectedConversation' => $this->selectedConversationId 
                ? Conversation::find($this->selectedConversationId) 
                : null
        ]);
    }
}