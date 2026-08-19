<div x-data="{ 
    currentChannel: null,
    onlineUsers: [],
    isTyping: false,
    typingTimeout: null,
    init() {
        window.Echo.join('online')
            .here((users) => {
                this.onlineUsers = users.map(u => u.id);
                $wire.updateOnlineUsers(this.onlineUsers);
            })
            .joining((user) => {
                if (!this.onlineUsers.includes(user.id)) {
                    this.onlineUsers.push(user.id);
                    $wire.updateOnlineUsers(this.onlineUsers);
                }
            })
            .leaving((user) => {
                this.onlineUsers = this.onlineUsers.filter(id => id !== user.id);
                $wire.updateOnlineUsers(this.onlineUsers);
            });

        $watch('$wire.selectedConversationId', id => {
            if (this.currentChannel) {
                window.Echo.leave(this.currentChannel);
            }
            this.isTyping = false;
            if (!id) return;
            this.currentChannel = 'chat.' + id;
            
            window.Echo.private(this.currentChannel)
                .listen('MessageSent', (e) => {
                    $wire.loadMessages();
                    $wire.loadConversations();
                })
                .listenForWhisper('typing', (e) => {
                    this.isTyping = e.typing;
                    clearTimeout(this.typingTimeout);
                    this.typingTimeout = setTimeout(() => {
                        this.isTyping = false;
                    }, 2000);
                });
        });
    }
}" class="flex flex-row h-[calc(100vh-4rem)] bg-[#efeae2] font-sans antialiased select-none">
    
    <div class="{{ $selectedConversationId ? 'hidden md:flex' : 'flex' }} flex-col w-full md:w-80 lg:w-96 flex-shrink-0 h-full bg-white border-r border-gray-200">
        
        <!-- En-tête Liste -->
        <div class="px-4 py-3 bg-[#008069] text-white flex items-center justify-between shadow-sm">
            <h1 class="text-xl font-bold tracking-wide">Messagerie</h1>
            <div class="flex space-x-4">
                <!-- Bouton Création Groupe -->
                <button wire:click="toggleGroupMode" class="opacity-80 hover:opacity-100 transition-opacity" title="Nouveau groupe">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </button>
            </div>
        </div>

        @if($isCreatingGroup)
            <!-- UI CREATION DE GROUPE -->
            <div class="p-4 bg-gray-50 border-b border-gray-200">
                <input wire:model="groupName" type="text" placeholder="Nom du groupe..." class="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 mb-3 outline-none">
                <button wire:click="createGroup" class="w-full bg-[#00a884] text-white rounded-lg py-2 text-sm font-bold shadow hover:bg-[#008069] transition">Créer le groupe</button>
            </div>
            <div class="flex-1 overflow-y-auto divide-y divide-gray-100">
                <div class="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sélectionner les participants</div>
                @foreach($searchResults as $user)
                    <label class="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150">
                        <input type="checkbox" wire:model="selectedParticipants" value="{{ $user->id }}" class="mr-4 w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500">
                        <div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg uppercase">{{ substr($user->name, 0, 1) }}</div>
                        <div class="ml-3 flex-1">
                            <p class="text-sm font-semibold text-gray-900">{{ $user->name }}</p>
                        </div>
                    </label>
                @endforeach
            </div>
        @else
            <!-- Barre de recherche normale -->
            <div class="p-2 bg-gray-50 border-b border-gray-100">
                <div class="relative flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input wire:model.live="searchQuery" type="text" placeholder="Rechercher ou démarrer une discussion" class="bg-transparent w-full text-sm outline-none border-none p-0 focus:ring-0 placeholder-gray-500 text-gray-700">
                </div>
            </div>

            <!-- Zone de défilement Conversations -->
            <div class="flex-1 overflow-y-auto divide-y divide-gray-100" wire:poll.10s>
                @if(!empty($searchQuery))
                    <!-- RÉSULTATS DE RECHERCHE -->
                    <div class="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacts trouvés</div>
                    @forelse($searchResults as $user)
                        <div wire:click="startConversation({{ $user->id }})" class="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150">
                            <div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg uppercase shadow-inner">{{ substr($user->name, 0, 1) }}</div>
                            <div class="ml-3 flex-1">
                                <p class="text-sm font-semibold text-gray-900">{{ $user->name }}</p>
                            </div>
                        </div>
                    @empty
                        <div class="p-4 text-center text-sm text-gray-500">Aucun contact correspondant.</div>
                    @endforelse
                @else
                    <!-- LISTE DES CONVERSATIONS ACTIVES -->
                    <!-- LISTE DES CONVERSATIONS ACTIVES -->
@forelse($conversations as $conv)
    @php 
        $isGroup = $conv->is_group;
        $chatName = $isGroup ? $conv->name : ($conv->user_one_id === auth()->id() ? $conv->userTwo->name : $conv->userOne->name);
        $lastMessage = $conv->messages->last();
        $isActive = $selectedConversationId === $conv->id;
        
        // Calcul du nombre de messages non lus
        $unreadCount = $conv->messages->where('sender_id', '!=', auth()->id())->where('is_read', false)->count();
    @endphp
    
    <!-- L'ajout de wire:key est crucial ici pour que le tri dynamique fonctionne à l'écran -->
    <div wire:key="conv-{{ $conv->id }}" wire:click="selectConversation({{ $conv->id }})" class="flex items-center px-4 py-3 cursor-pointer transition-colors duration-150 border-b border-gray-100 {{ $isActive ? 'bg-gray-100' : 'hover:bg-gray-50' }}">
        <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-lg uppercase shadow-inner flex-shrink-0">{{ substr($chatName, 0, 1) }}</div>
        
        <div class="ml-3 flex-1 min-w-0">
            <div class="flex items-baseline justify-between">
                <p class="text-sm font-semibold text-gray-900 truncate">{{ $chatName }}</p>
                <p class="text-xs font-light ml-2 {{ $unreadCount > 0 ? 'text-[#00a884] font-semibold' : 'text-gray-400' }}">
                    {{ $lastMessage ? \Carbon\Carbon::parse($lastMessage->created_at)->timezone(config('app.timezone'))->format('H:i') : '' }}
                </p>
            </div>
            
            <div class="flex items-center justify-between mt-0.5">
                <p class="text-xs truncate pr-2 {{ $unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500' }}">
                    @if($lastMessage)
                        @if($lastMessage->file_path) 📷 Fichier @else {{ $lastMessage->body }} @endif
                    @else
                        Aucun message
                    @endif
                </p>
                
                <!-- Badge de notification -->
                @if($unreadCount > 0)
                    <span class="bg-[#00a884] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                        {{ $unreadCount }}
                    </span>
                @endif
            </div>
        </div>
    </div>
@empty
    <div class="p-8 text-center text-sm text-gray-400">Aucune discussion active.</div>
@endforelse
                @endif
            </div>
        @endif
    </div>

    <!-- ÉCRAN : FENÊTRE DE MESSAGERIE -->
    <div class="{{ $selectedConversationId ? 'flex' : 'hidden md:flex' }} flex-col flex-1 h-full bg-[#efeae2] relative">
        @if($selectedConversation)
            @php
                $isGroup = $selectedConversation->is_group;
                $chatName = $isGroup ? $selectedConversation->name : ($selectedConversation->user_one_id === auth()->id() ? $selectedConversation->userTwo->name : $selectedConversation->userOne->name);
                $receiverId = $isGroup ? null : ($selectedConversation->user_one_id === auth()->id() ? $selectedConversation->user_two_id : $selectedConversation->user_one_id);
            @endphp
            
            <!-- En-tête du Chat -->
            <div class="px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div class="flex items-center min-w-0">
                    <button wire:click="$set('selectedConversationId', null)" class="mr-2 p-1 text-gray-600 hover:bg-gray-200 rounded-full md:hidden transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div class="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold uppercase shadow-sm">{{ substr($chatName, 0, 1) }}</div>
                    <div class="ml-3 min-w-0">
                        <p class="text-sm font-semibold text-gray-900 truncate">{{ $chatName }}</p>
                        <p class="text-xs text-gray-500">
                            @if($isGroup)
                                {{ $selectedConversation->participants->count() }} participants
                            @else
                                <template x-if="isTyping">
                                    <span class="text-emerald-600 italic font-medium animate-pulse">en train d'écrire...</span>
                                </template>
                                <template x-if="!isTyping">
                                    <span>
                                        @if(in_array($receiverId, $onlineUsers))
                                            <span class="text-emerald-600 font-medium">en ligne</span>
                                        @else
                                            <span class="text-gray-400">hors ligne</span>
                                        @endif
                                    </span>
                                </template>
                            @endif
                        </p>
                    </div>
                </div>
            </div>

            <!-- Fil des messages -->
            <div class="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 flex flex-col min-h-0 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                @foreach($messages as $msg)
                    @php $isMe = $msg['sender_id'] === auth()->id(); @endphp
                    <div class="flex w-full {{ $isMe ? 'justify-end' : 'justify-start' }}">
                        <div class="max-w-[75%] rounded-lg px-3 py-1.5 text-sm shadow-sm relative break-words {{ $isMe ? 'bg-[#d9fdd3] text-gray-900' : 'bg-white text-gray-900' }}">
                            
                            <!-- Affichage du nom de l'expéditeur si c'est un groupe et que ce n'est pas nous -->
                            @if($isGroup && !$isMe)
                                <p class="text-[10px] text-emerald-600 font-bold mb-1">{{ $msg['sender']['name'] ?? 'Utilisateur' }}</p>
                            @endif

                            <div class="leading-relaxed pr-8 space-y-1">
                                @if(!empty($msg['file_path']))
                                    @if(str_starts_with($msg['file_type'], 'image/'))
                                        <div class="rounded-md overflow-hidden max-w-xs my-1">
                                            <img src="{{ asset('storage/' . $msg['file_path']) }}" class="object-cover max-h-60 w-full" alt="Image">
                                        </div>
                                    @else
                                        <a href="{{ asset('storage/' . $msg['file_path']) }}" target="_blank" class="flex items-center space-x-2 bg-black/5 p-2 rounded text-emerald-800 hover:underline font-medium text-xs my-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <span class="truncate max-w-[180px]">Télécharger le document</span>
                                        </a>
                                    @endif
                                @endif

                                @if(!empty($msg['body']))
                                    <p>{{ $msg['body'] }}</p>
                                @endif
                            </div>
                            <span class="absolute bottom-1 right-2 text-[10px] text-gray-400 font-light select-none">
                                {{ \Carbon\Carbon::parse($msg['created_at'])->timezone(config('app.timezone'))->format('H:i') }}
                            </span>
                        </div>
                    </div>
                @endforeach
            </div>

            <!-- Formulaire d'envoi -->
            <div class="p-2.5 bg-[#f0f2f5] border-t border-gray-200 flex items-center sticky bottom-0 z-10">
                <form wire:submit.prevent="sendMessage" class="flex flex-col w-full space-y-2">
                    @if(isset($file) && $file)
                        <div class="p-2 bg-emerald-50 rounded-lg flex items-center justify-between text-xs text-gray-600 border border-emerald-200">
                            <span class="truncate">Fichier prêt : {{ $file->getClientOriginalName() }}</span>
                            <button type="button" wire:click="$set('file', null)" class="text-red-500 font-bold ml-2">Annuler</button>
                        </div>
                    @endif

                    <div class="flex w-full items-center space-x-2">
                        <label class="p-2 text-gray-500 hover:bg-gray-200 rounded-full cursor-pointer transition-colors flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <input type="file" wire:model="file" class="hidden">
                        </label>

                        <input wire:model="newMessageBody" 
                               x-on:input="window.Echo.private(currentChannel).whisper('typing', { name: '{{ auth()->user()->name }}', typing: true })" 
                               type="text" 
                               placeholder="Tapez un message" 
                               class="flex-1 bg-white rounded-lg px-4 py-2 text-sm border-none outline-none focus:ring-1 focus:ring-emerald-500 text-gray-700 shadow-inner">
                        
                        <button type="submit" class="p-2 bg-[#00a884] text-white rounded-full hover:bg-[#008069] transition-all duration-150 shadow-md flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 rotate-90 transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9-2-9-11-9 11 9 2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </form>
            </div>
        @else
            <!-- Écran d'attente -->
            <div class="hidden md:flex flex-col flex-1 items-center justify-center text-center p-8 bg-[#f8f9fa]">
                <div class="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <h2 class="text-xl font-medium text-gray-700">Messagerie Web Locale</h2>
                <p class="text-sm text-gray-400 max-w-xs mt-1">Sélectionnez une discussion ou créez un groupe pour communiquer avec plusieurs amis.</p>
            </div>
        @endif
    </div>
</div>