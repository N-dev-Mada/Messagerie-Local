'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Smile, Heart, ThumbsUp, Coffee, Sparkles } from 'lucide-react';

interface EmojiItem {
  char: string;
  name: string;
  category: string;
}

const EMOJI_DATABASE: EmojiItem[] = [
  // Smileys & Émotions
  { char: '😀', name: 'sourire visage heureux', category: 'smileys' },
  { char: '😃', name: 'grand sourire joie', category: 'smileys' },
  { char: '😄', name: 'yeux plissés rire', category: 'smileys' },
  { char: '😁', name: 'dents sourire fier', category: 'smileys' },
  { char: '😆', name: 'rire aux éclats mdr', category: 'smileys' },
  { char: '😅', name: 'sourire sueur soulagement', category: 'smileys' },
  { char: '😂', name: 'mort de rire larmes larmes de joie', category: 'smileys' },
  { char: '🤣', name: 'rouler par terre de rire lol', category: 'smileys' },
  { char: '😊', name: 'sourire timide rougeur', category: 'smileys' },
  { char: '😇', name: 'ange auréole innocent', category: 'smileys' },
  { char: '🙂', name: 'léger sourire sympa', category: 'smileys' },
  { char: '🙃', name: 'tête en bas ironie blague', category: 'smileys' },
  { char: '😉', name: 'clin oeil complice', category: 'smileys' },
  { char: '😌', name: 'soulagé zen paisible', category: 'smileys' },
  { char: '😍', name: 'yeux coeur amoureux amour', category: 'smileys' },
  { char: '🥰', name: 'trois coeurs affection tendre', category: 'smileys' },
  { char: '😘', name: 'bisou baiser coeur', category: 'smileys' },
  { char: '😗', name: 'bisou lèvres siffler', category: 'smileys' },
  { char: '😋', name: 'langue miam délicieux appétissant', category: 'smileys' },
  { char: '😛', name: 'tire la langue joueur', category: 'smileys' },
  { char: '😜', name: 'clin oeil langue folie délire', category: 'smileys' },
  { char: '🤪', name: 'fou dingue zany', category: 'smileys' },
  { char: '😝', name: 'yeux fermés langue taquiner', category: 'smileys' },
  { char: '🤑', name: 'argent dollars riche', category: 'smileys' },
  { char: '🤗', name: 'câlin bras ouverts chaleureux', category: 'smileys' },
  { char: '🤭', name: 'main sur la bouche rire oups', category: 'smileys' },
  { char: '🤫', name: 'chut secret silence silence radio', category: 'smileys' },
  { char: '🤔', name: 'pensif réflexion doutes hmm', category: 'smileys' },
  { char: '🤐', name: 'fermeture éclair bouche cousue motus', category: 'smileys' },
  { char: '🤨', name: 'sourcil levé sceptique méfiant', category: 'smileys' },
  { char: '😐', name: 'neutre blasé impassible', category: 'smileys' },
  { char: '😑', name: 'sans expression soupir', category: 'smileys' },
  { char: '😶', name: 'sans bouche muet', category: 'smileys' },
  { char: '😏', name: 'sourire en coin malicieux', category: 'smileys' },
  { char: '😒', name: 'dépité pas content blasé', category: 'smileys' },
  { char: '🙄', name: 'lève les yeux exaspéré', category: 'smileys' },
  { char: '😬', name: 'grimace gêné embarrassé', category: 'smileys' },
  { char: '🤥', name: 'pinocchio menteur mensonge nez long', category: 'smileys' },
  { char: '😴', name: 'dort dodo fatigue zzz', category: 'smileys' },
  { char: '😷', name: 'masque malade virus', category: 'smileys' },
  { char: '🤒', name: 'thermomètre fièvre malade', category: 'smileys' },
  { char: '🤕', name: 'bandage blessé mal de tête', category: 'smileys' },
  { char: '🤢', name: 'nausée dégoût malade vert', category: 'smileys' },
  { char: '🤮', name: 'vomi vomir dégoûtant', category: 'smileys' },
  { char: '🤧', name: 'éternuement rhume mouchoir', category: 'smileys' },
  { char: '🥵', name: 'chaud rouge sueur soif canicule', category: 'smileys' },
  { char: '🥶', name: 'froid gelé bleu frisson', category: 'smileys' },
  { char: '🥴', name: 'bourré ivre vertige étourdi', category: 'smileys' },
  { char: '😵', name: 'étourdi sonné ko', category: 'smileys' },
  { char: '🤯', name: 'tête qui explose esprit soufflé incroyable', category: 'smileys' },
  { char: '🤠', name: 'cowboy chapeau ouest', category: 'smileys' },
  { char: '🥳', name: 'fête cotillon anniversaire teuf', category: 'smileys' },
  { char: '😎', name: 'lunettes de soleil cool swag classe', category: 'smileys' },
  { char: '🤓', name: 'nerd intello lunettes geek', category: 'smileys' },
  { char: '🧐', name: 'monocle observateur détective sérieux', category: 'smileys' },
  { char: '😕', name: 'confus inquiet hésitant', category: 'smileys' },
  { char: '😟', name: 'inquiet soucieux angoissé', category: 'smileys' },
  { char: '🙁', name: 'triste déçu', category: 'smileys' },
  { char: '😮', name: 'bouche bée surpris étonné', category: 'smileys' },
  { char: '😯', name: 'chut surpris discret', category: 'smileys' },
  { char: '😲', name: 'stupéfait stupéfaction choqué', category: 'smileys' },
  { char: '😳', name: 'yeux écarquillés rouge choc honte', category: 'smileys' },
  { char: '🥺', name: 'yeux doux suppliant pitié s il te plait', category: 'smileys' },
  { char: '😦', name: 'froncement sourcils bouche ouverte peur', category: 'smileys' },
  { char: '😧', name: 'angoissé paniqué terrifié', category: 'smileys' },
  { char: '😨', name: 'peur effrayé craintif', category: 'smileys' },
  { char: '😰', name: 'goutte de sueur angoisse panique', category: 'smileys' },
  { char: '😥', name: 'tristesse soulagée déception', category: 'smileys' },
  { char: '😢', name: 'larme tristesse pleur chagrin', category: 'smileys' },
  { char: '😭', name: 'pleurs chaudes larmes sanglots désespoir', category: 'smileys' },
  { char: '😱', name: 'cri d effroi horreur panique peur', category: 'smileys' },
  { char: '😖', name: 'agacé contrarié crispé', category: 'smileys' },
  { char: '😣', name: 'persévérant douleur souffrance', category: 'smileys' },
  { char: '😞', name: 'dépité déçu triste regard bas', category: 'smileys' },
  { char: '😓', name: 'sueur visage baissé stress fatigue', category: 'smileys' },
  { char: '😩', name: 'épuisé las ras-le-bol marre', category: 'smileys' },
  { char: '😫', name: 'fatigué gémissement supplication', category: 'smileys' },
  { char: '🥱', name: 'bâillement sommeil ennui dodo', category: 'smileys' },
  { char: '😤', name: 'fumée nez triomphant énervé colère', category: 'smileys' },
  { char: '😡', name: 'en colère rouge furieux énervé rage', category: 'smileys' },
  { char: '😠', name: 'fâché mécontent sourcils', category: 'smileys' },
  { char: '🤬', name: 'insultes juron censure grossièreté', category: 'smileys' },

  // Gestes & Mains
  { char: '👍', name: 'pouce en l air ok bien d accord yes super', category: 'gestures' },
  { char: '👎', name: 'pouce en bas nul pas d accord mauvais', category: 'gestures' },
  { char: '👌', name: 'ok parfait nickel super', category: 'gestures' },
  { char: '✌️', name: 'victoire peace paix deux', category: 'gestures' },
  { char: '🤞', name: 'croiser les doigts chance espoir', category: 'gestures' },
  { char: '🤟', name: 'signe amour rock love', category: 'gestures' },
  { char: '🤘', name: 'cornes rock métal fête', category: 'gestures' },
  { char: '🤙', name: 'appelle-moi shaka cool téléphone', category: 'gestures' },
  { char: '👈', name: 'doigt gauche pointe regarde', category: 'gestures' },
  { char: '👉', name: 'doigt droite pointe ici', category: 'gestures' },
  { char: '👆', name: 'doigt haut au-dessus regarde', category: 'gestures' },
  { char: '👇', name: 'doigt bas en dessous lien', category: 'gestures' },
  { char: '☝️', name: 'doigt levé attention numéro un', category: 'gestures' },
  { char: '✋', name: 'main levée stop coucou salut pause', category: 'gestures' },
  { char: '🤚', name: 'dos de la main stop attend', category: 'gestures' },
  { char: '🖐️', name: 'main doigts écartés cinq', category: 'gestures' },
  { char: '🖖', name: 'salut vulcain star trek', category: 'gestures' },
  { char: '👋', name: 'coucou au revoir bonjour salut signe', category: 'gestures' },
  { char: '🤝', name: 'poignée de main accord marché deal partenariat', category: 'gestures' },
  { char: '👏', name: 'applaudissements bravo félicitations applaudis', category: 'gestures' },
  { char: '🙌', name: 'mains en l air célébration victoire hourra', category: 'gestures' },
  { char: '👐', name: 'mains ouvertes accueil cadeau', category: 'gestures' },
  { char: '🤲', name: 'mains paumes vers le haut prière don', category: 'gestures' },
  { char: '🙏', name: 'mains jointes merci prière pardon s il te plaît gratitude', category: 'gestures' },
  { char: '💪', name: 'muscle bras fort force courage détermination', category: 'gestures' },
  { char: '👊', name: 'poing en avant check coup frappe', category: 'gestures' },
  { char: '🤛', name: 'poing gauche check bro', category: 'gestures' },
  { char: '🤜', name: 'poing droit check respect', category: 'gestures' },

  // Cœurs & Amour
  { char: '❤️', name: 'coeur rouge amour passion j aime', category: 'hearts' },
  { char: '🧡', name: 'coeur orange amitié chaleur', category: 'hearts' },
  { char: '💛', name: 'coeur jaune joie soleil amitié', category: 'hearts' },
  { char: '💚', name: 'coeur vert espoir nature écolo', category: 'hearts' },
  { char: '💙', name: 'coeur bleu paix confiance sérénité', category: 'hearts' },
  { char: '💜', name: 'coeur violet magie mystère', category: 'hearts' },
  { char: '🖤', name: 'coeur noir élégance dark deuil', category: 'hearts' },
  { char: '🤍', name: 'coeur blanc pureté paix ange', category: 'hearts' },
  { char: '🤎', name: 'coeur marron chocolat terre', category: 'hearts' },
  { char: '💔', name: 'coeur brisé peine rupture chagrin triste', category: 'hearts' },
  { char: '💖', name: 'coeur scintillant étincelles brillant magique', category: 'hearts' },
  { char: '💗', name: 'coeur grandissant émotion battement', category: 'hearts' },
  { char: '💓', name: 'coeur qui bat pulsations coup de foudre', category: 'hearts' },
  { char: '💞', name: 'coeurs qui tournent amour fusionnel', category: 'hearts' },
  { char: '💕', name: 'deux coeurs tendresse amour mignon', category: 'hearts' },
  { char: '💌', name: 'lettre d amour message enveloppe coeur', category: 'hearts' },

  // Objets & Symboles
  { char: '🔥', name: 'feu flamme hot chaud tendance génial', category: 'objects' },
  { char: '✨', name: 'étincelles étoiles magique brille propre', category: 'objects' },
  { char: '🎉', name: 'fête cotillons célébration bravo félicitations', category: 'objects' },
  { char: '🎊', name: 'confettis ballon fête événement', category: 'objects' },
  { char: '🎁', name: 'cadeau boîte surprise anniversaire noël', category: 'objects' },
  { char: '🏆', name: 'trophée coupe champion gagnant premier victoire', category: 'objects' },
  { char: '🚀', name: 'fusée décollage départ rapide vitesse crypto', category: 'objects' },
  { char: '💡', name: 'ampoule idée géniale illumination pensée', category: 'objects' },
  { char: '⭐', name: 'étoile star favori note', category: 'objects' },
  { char: '🌟', name: 'étoile brillante éclatante super', category: 'objects' },
  { char: '💯', name: 'cent parfait exact 100%', category: 'objects' },
  { char: '✅', name: 'coche verte validé fait réussi ok check', category: 'objects' },
  { char: '❌', name: 'croix rouge annulé refusé faux erreur', category: 'objects' },
  { char: '⚠️', name: 'attention danger avertissement alerte', category: 'objects' },
  { char: '📌', name: 'punaise épingle important note', category: 'objects' },
  { char: '📁', name: 'dossier fichier document rangement', category: 'objects' },
  { char: '💻', name: 'ordinateur portable pc laptop travail dev', category: 'objects' },
  { char: '📱', name: 'smartphone téléphone portable mobile appel', category: 'objects' },
  { char: '🕒', name: 'horloge temps heure attente retard', category: 'objects' },
  { char: '🔔', name: 'cloche notification rappel alerte', category: 'objects' },

  // Nourriture & Café
  { char: '☕', name: 'café thé boisson chaude pause matin', category: 'food' },
  { char: '🍕', name: 'pizza fromage repas faim miam', category: 'food' },
  { char: '🍔', name: 'burger hamburger fast food frites', category: 'food' },
  { char: '🍟', name: 'frites frites belges repas', category: 'food' },
  { char: '🍎', name: 'pomme fruit rouge santé vitamines', category: 'food' },
  { char: '🍰', name: 'gâteau part dessert sucré anniversaire', category: 'food' },
  { char: '🎂', name: 'gâteau d anniversaire bougies fête', category: 'food' },
  { char: '🍻', name: 'bières trinquer santé apéro tchin', category: 'food' },
  { char: '🥂', name: 'verres champagne trinquer fête mariage', category: 'food' },
  { char: '🍷', name: 'vin verre rouge apéro repas', category: 'food' },
];

const CATEGORIES = [
  { id: 'all', label: 'Tous', icon: Sparkles },
  { id: 'smileys', label: 'Smileys', icon: Smile },
  { id: 'gestures', label: 'Gestes', icon: ThumbsUp },
  { id: 'hearts', label: 'Cœurs', icon: Heart },
  { id: 'objects', label: 'Objets', icon: Sparkles },
  { id: 'food', label: 'Pause', icon: Coffee },
];

interface EmojiPickerProps {
  onSelectEmoji: (char: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelectEmoji, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Filter emojis
  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase();
    return EMOJI_DATABASE.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return item.name.toLowerCase().includes(q) || item.char === q;
    });
  }, [activeCategory, search]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-16 left-2 sm:left-4 z-40 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 flex flex-col animate-in fade-in zoom-in-95 duration-150 select-none"
    >
      {/* Search bar & Close */}
      <div className="flex items-center space-x-2 mb-2.5">
        <div className="relative flex-1 flex items-center bg-gray-100 rounded-lg px-2.5 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500 border border-transparent focus-within:border-emerald-500 transition">
          <Search className="w-4 h-4 text-gray-400 mr-1.5 flex-shrink-0" />
          <input
            id="emoji-search-input"
            type="text"
            placeholder="Rechercher un émoji..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent border-none outline-hidden p-0 text-gray-800 placeholder-gray-400"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category selector pills */}
      {!search && (
        <div className="flex items-center space-x-1 mb-2 border-b border-gray-100 pb-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-[#00a884] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emojis Grid */}
      <div className="grid grid-cols-7 gap-1 max-h-56 overflow-y-auto pr-1">
        {filteredEmojis.length > 0 ? (
          filteredEmojis.map((item, idx) => (
            <button
              key={`${item.char}-${idx}`}
              onClick={() => onSelectEmoji(item.char)}
              title={item.name}
              className="w-9 h-9 flex items-center justify-center text-xl rounded-lg hover:bg-emerald-50 hover:scale-110 active:scale-95 transition cursor-pointer"
            >
              {item.char}
            </button>
          ))
        ) : (
          <div className="col-span-7 py-8 text-center text-xs text-gray-400">
            Aucun émoji trouvé pour "{search}"
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 px-1">
        <span>Cliquez pour insérer</span>
        <span className="font-semibold text-emerald-600">{filteredEmojis.length} émojis</span>
      </div>
    </div>
  );
}
