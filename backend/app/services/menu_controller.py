from typing import List, Dict, Any, Optional, Tuple
import time

MENU_TREE = [
    {
        "id": "cat_needs",
        "title": "Needs Assistance",
        "items": [
            {"id": "water", "label": "Request Water", "spoken": "Request Water", "action": "request", "param": "water", "category": "NEEDS"},
            {"id": "food", "label": "Request Food", "spoken": "Request Food", "action": "request", "param": "food", "category": "NEEDS"},
            {"id": "pain", "label": "Pain or Discomfort", "spoken": "Report Pain or Discomfort", "action": "request", "param": "pain", "category": "NEEDS"},
            {"id": "washroom", "label": "Washroom Assistance", "spoken": "Washroom Assistance", "action": "request", "param": "washroom", "category": "NEEDS"},
            {"id": "help", "label": "General Help", "spoken": "General Help", "action": "request", "param": "help", "category": "NEEDS"},
        ]
    },
    {
        "id": "cat_emergency",
        "title": "Emergency",
        "items": [
            {"id": "emergency", "label": "Emergency Assistance", "spoken": "Request Emergency Assistance", "action": "request", "param": "emergency", "category": "EMERGENCY", "is_emergency": True},
        ]
    },
    {
        "id": "cat_entertainment",
        "title": "Entertainment",
        "items": [
            {"id": "music_play", "label": "Play Music", "spoken": "Play Music", "action": "music", "param": "play", "category": "ENTERTAINMENT"},
            {"id": "music_pause", "label": "Pause Music", "spoken": "Pause Music", "action": "music", "param": "pause", "category": "ENTERTAINMENT"},
            {"id": "music_resume", "label": "Resume Music", "spoken": "Resume Music", "action": "music", "param": "resume", "category": "ENTERTAINMENT"},
            {"id": "music_stop", "label": "Stop Music", "spoken": "Stop Music", "action": "music", "param": "stop", "category": "ENTERTAINMENT"},
        ]
    },
    {
        "id": "cat_room",
        "title": "Smart Room",
        "items": [
            {"id": "light_on", "label": "Turn Light On", "spoken": "Turn Light On", "action": "room", "param": "light_on", "category": "SMART ROOM"},
            {"id": "light_off", "label": "Turn Light Off", "spoken": "Turn Light Off", "action": "room", "param": "light_off", "category": "SMART ROOM"},
            {"id": "fan_increase", "label": "Increase Fan Speed", "spoken": "Increase Fan Speed", "action": "room", "param": "fan_up", "category": "SMART ROOM"},
            {"id": "fan_decrease", "label": "Decrease Fan Speed", "spoken": "Decrease Fan Speed", "action": "room", "param": "fan_down", "category": "SMART ROOM"},
        ]
    }
]

class MenuController:
    def __init__(self, timeout_sec: int = 15):
        self.menu_tree = MENU_TREE
        # Flat list for sequential navigation
        self.flat_items = []
        for cat in self.menu_tree:
            for it in cat["items"]:
                self.flat_items.append(it)
        
        self.active_index = 0
        self.last_interaction_time = time.time()
        self.timeout_sec = timeout_sec
        self.pending_confirmation: Optional[Dict[str, Any]] = None

    def get_current_item(self) -> Dict[str, Any]:
        return self.flat_items[self.active_index]

    def get_state(self) -> Dict[str, Any]:
        current = self.get_current_item()
        return {
            "active_index": self.active_index,
            "total_items": len(self.flat_items),
            "current_item": current,
            "pending_confirmation": self.pending_confirmation,
            "menu_tree": self.menu_tree,
            "flat_items": self.flat_items
        }

    def navigate_next(self) -> Dict[str, Any]:
        self.last_interaction_time = time.time()
        self.pending_confirmation = None
        self.active_index = (self.active_index + 1) % len(self.flat_items)
        return self.get_state()

    def navigate_prev(self) -> Dict[str, Any]:
        self.last_interaction_time = time.time()
        self.pending_confirmation = None
        self.active_index = (self.active_index - 1 + len(self.flat_items)) % len(self.flat_items)
        return self.get_state()

    def select_current(self) -> Tuple[Dict[str, Any], bool, Optional[str]]:
        """
        Returns: (menu_state, executed, speech_text)
        """
        self.last_interaction_time = time.time()
        item = self.get_current_item()

        # If item is emergency and not yet confirmed, require confirmation step for safety!
        if item.get("is_emergency") and not self.pending_confirmation:
            self.pending_confirmation = {
                "item": item,
                "prompt": "Confirm Emergency Assistance? Select again within 5 seconds to activate."
            }
            return self.get_state(), False, "Confirm Emergency Assistance? Select again to activate."

        # Execute action
        self.pending_confirmation = None
        speech_text = f"Your selected option is {item['label']}."
        return self.get_state(), True, speech_text

    def cancel_or_back(self) -> Tuple[Dict[str, Any], str]:
        self.last_interaction_time = time.time()
        if self.pending_confirmation:
            self.pending_confirmation = None
            return self.get_state(), "Emergency request cancelled."
        else:
            self.active_index = 0
            return self.get_state(), "Navigation reset to main item."

menu_controller = MenuController()
