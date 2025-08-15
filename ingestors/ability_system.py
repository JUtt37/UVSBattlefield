#!/usr/bin/env python3
"""
UVS Ability System - Basic Version
Handles card abilities based on conditions and costs
"""

import json
import re

class AbilitySystem:
    def __init__(self):
        self.enhance_costs = ['Commit', 'Flip', 'Discard', 'Remove', 'Destroy', 'Clear']
        self.enhance_conditions = ['If this attack deals damage', 'If this attack is blocked', 'If you have']
        self.response_triggers = ['After this attack deals damage', 'After your attack resolves', 'At the start of']
    
    def parse_ability(self, ability_text):
        """Parse an ability text and categorize it"""
        if not ability_text or not isinstance(ability_text, str):
            return None
            
        ability_text = ability_text.strip()
        
        # Enhance abilities
        if ability_text.startswith('E:') or ability_text.startswith('Enhance:'):
            return self.parse_enhance_ability(ability_text)
        
        # Response abilities
        elif ability_text.startswith('R:') or ability_text.startswith('Response:'):
            return self.parse_response_ability(ability_text)
        
        # Other abilities
        else:
            return {'type': 'static', 'effect': ability_text}
    
    def parse_enhance_ability(self, ability_text):
        """Parse an enhance ability"""
        if ability_text.startswith('E:'):
            text = ability_text[2:].strip()
        elif ability_text.startswith('Enhance:'):
            text = ability_text[8:].strip()
        else:
            text = ability_text
            
        # Check for costs
        cost = None
        for cost_type in self.enhance_costs:
            if cost_type.lower() in text.lower():
                cost = cost_type
                break
        
        # Check for conditions
        condition = None
        for condition_type in self.enhance_conditions:
            if condition_type.lower() in text.lower():
                condition = condition_type
                break
        
        return {
            'type': 'enhance',
            'cost': cost,
            'condition': condition,
            'effect': text,
            'original_text': ability_text
        }
    
    def parse_response_ability(self, ability_text):
        """Parse a response ability"""
        if ability_text.startswith('R:'):
            text = ability_text[2:].strip()
        elif ability_text.startswith('Response:'):
            text = ability_text[9:].strip()
        else:
            text = ability_text
            
        # Check for triggers
        trigger = None
        for trigger_type in self.response_triggers:
            if trigger_type.lower() in text.lower():
                trigger = trigger_type
                break
        
        return {
            'type': 'response',
            'trigger': trigger,
            'effect': text,
            'original_text': ability_text
        }
    
    def categorize_card_abilities(self, card):
        """Categorize all abilities on a card"""
        abilities = card.get('abilities', [])
        categorized = {
            'enhances': [],
            'responses': [],
            'static': []
        }
        
        for ability in abilities:
            parsed = self.parse_ability(ability)
            if parsed:
                if parsed['type'] == 'enhance':
                    categorized['enhances'].append(parsed)
                elif parsed['type'] == 'response':
                    categorized['responses'].append(parsed)
                else:
                    categorized['static'].append(parsed)
        
        return categorized

def main():
    """Test the ability system"""
    print("🧪 Testing UVS Ability System")
    
    # Load sample cards
    with open('complete_card_database.json', 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    ability_system = AbilitySystem()
    
    # Test with first few cards
    for i in range(min(5, len(cards))):
        card = cards[i]
        print(f"\nCard: {card.get('name', 'Unknown')}")
        
        categorized = ability_system.categorize_card_abilities(card)
        print(f"  Enhances: {len(categorized['enhances'])}")
        print(f"  Responses: {len(categorized['responses'])}")
        print(f"  Static: {len(categorized['static'])}")
    
    print(f"\n✅ Ability system ready!")

if __name__ == "__main__":
    main()
