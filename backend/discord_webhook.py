# discord_webhook.py
import requests
import os

class DiscordNotifier:
    def __init__(self):
        self.webhook_url = os.getenv('DISCORD_WEBHOOK')
    
    def send_alert(self, message):
        data = {"content": message}
        requests.post(self.webhook_url, json=data)
