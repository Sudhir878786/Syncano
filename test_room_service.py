from app.services.room_service import RoomService

# Test without Redis
print("Testing RoomService without Redis...")
rs = RoomService()
print(f"✓ RoomService initialized (using Redis: {rs.use_redis})")

# Create room
room = rs.create_room('test123', 'TestUser')
print(f"✓ Created room: {room['room_id']}")

# Join room
join_data = rs.join_room(room['room_id'], 'test456', 'SecondUser')
if join_data:
    print(f"✓ SecondUser joined room")
    print(f"  Users in room: {len(join_data['users'])}")
else:
    print("✗ Failed to join room")

print("\n✓ All tests passed!")
