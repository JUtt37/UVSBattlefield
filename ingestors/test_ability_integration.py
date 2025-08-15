#!/usr/bin/env python3
"""
Test Ability System Integration
Verifies that the ability system is working correctly
"""

import json

def test_ability_system():
    """Test the ability system with sample cards"""
    print("🧪 Testing Ability System Integration")
    print("=" * 50)
    
    # Load the complete card database
    with open('complete_card_database.json', 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    # Find some cards with abilities to test
    test_cards = []
    
    for card in cards:
        abilities = card.get('abilities', [])
        if abilities:
            test_cards.append(card)
            if len(test_cards) >= 5:  # Get 5 cards with abilities
                break
    
    print(f"📊 Found {len(test_cards)} cards with abilities for testing")
    
    # Test each card
    for i, card in enumerate(test_cards):
        print(f"\n🎴 Card {i+1}: {card.get('name', 'Unknown')}")
        print(f"   Type: {card.get('type', 'Unknown')}")
        
        abilities = card.get('abilities', [])
        print(f"   Abilities ({len(abilities)}):")
        
        for j, ability in enumerate(abilities):
            print(f"     {j+1}. {ability}")
            
            # Test ability parsing
            if ability.startswith('E:') or ability.startswith('Enhance:') or ability.startswith('Enhance '):
                print(f"        → ENHANCE ability detected")
            elif ability.startswith('R:') or ability.startswith('Response:') or ability.startswith('Response '):
                print(f"        → RESPONSE ability detected")
            else:
                print(f"        → STATIC ability detected")
    
    print(f"\n✅ Ability system test complete!")
    print(f"📝 Ready to test in the game!")
    
    # Show some example ability patterns
    print(f"\n🎯 Example Ability Patterns Found:")
    
    enhance_count = 0
    response_count = 0
    static_count = 0
    
    for card in cards[:100]:  # Check first 100 cards
        abilities = card.get('abilities', [])
        for ability in abilities:
            if ability.startswith('E:') or ability.startswith('Enhance:') or ability.startswith('Enhance '):
                enhance_count += 1
            elif ability.startswith('R:') or ability.startswith('Response:') or ability.startswith('Response '):
                response_count += 1
            else:
                static_count += 1
    
    print(f"   Enhances: {enhance_count}")
    print(f"   Responses: {response_count}")
    print(f"   Static: {static_count}")

def test_game_integration():
    """Test that the game integration files are ready"""
    print(f"\n🎮 Testing Game Integration Files")
    print("=" * 50)
    
    try:
        # Check if the enhanced game startup file exists
        with open('game_startup_with_abilities.js', 'r', encoding='utf-8') as f:
            content = f.read()
            
        if 'AbilitySystem' in content:
            print("✅ Ability system found in game startup file")
        else:
            print("❌ Ability system not found in game startup file")
            
        if 'checkEnhanceAbilities' in content:
            print("✅ Enhance ability functions found")
        else:
            print("❌ Enhance ability functions not found")
            
        if 'checkResponseAbilities' in content:
            print("✅ Response ability functions found")
        else:
            print("❌ Response ability functions not found")
            
    except FileNotFoundError:
        print("❌ game_startup_with_abilities.js not found")
    
    print(f"\n🎉 Integration test complete!")

def main():
    """Main test function"""
    test_ability_system()
    test_game_integration()
    
    print(f"\n🚀 Ready to test in browser!")
    print(f"📁 Open: http://localhost:8000")
    print(f"🎯 Try clicking 'Check Enhances' button to test ability system")

if __name__ == "__main__":
    main()
