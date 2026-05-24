#!/usr/bin/env python3
"""
Chat History Export Script

Exports JSONL chat files with:
- Per-conversation timestamps [YYYY-MM-DD HH:MM:SS]
- Extracted images with timestamp-prefixed filenames
- Organized by conversation date
- Image inventory headers in each export

Usage:
    python3 scripts/export-chat-history.py \
        --input path/to/chat1.jsonl path/to/chat2.jsonl \
        --output /tmp/chat_exports
"""

import json
import sys
import os
import re
import base64
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from typing import List, Dict, Any, Tuple, Optional


def parse_timestamp(ts: Any) -> Optional[datetime]:
    """Parse timestamp from Unix milliseconds or ISO string."""
    if isinstance(ts, (int, float)):
        # Unix milliseconds
        return datetime.fromtimestamp(ts / 1000)
    elif isinstance(ts, str):
        # Try ISO format
        try:
            return datetime.fromisoformat(ts.replace('Z', '+00:00'))
        except:
            return None
    return None


def extract_images_from_response(response: List[Dict], output_dir: str, source_name: str, conv_timestamp: datetime) -> List[str]:
    """Extract base64 images from response array."""
    image_paths = []
    image_count = 0
    
    for item in response:
        if not isinstance(item, dict):
            continue
        
        # Check for value field with $base64 sub-field
        if 'value' in item and isinstance(item['value'], dict) and '$base64' in item['value']:
            image_count += 1
            b64_data = item['value']['$base64']
            
            # Decode base64
            try:
                image_data = base64.b64decode(b64_data)
            except Exception as e:
                print(f"  ⚠️  Failed to decode image: {e}", file=sys.stderr)
                continue
            
            # Create filename with timestamp
            date_str = conv_timestamp.strftime('%Y%m%d')
            time_str = conv_timestamp.strftime('%H%M%S')
            img_num = str(image_count).zfill(3)
            filename = f"{source_name}_{date_str}_{time_str}_image_{img_num}.png"
            filepath = os.path.join(output_dir, filename)
            
            # Write file
            with open(filepath, 'wb') as f:
                f.write(image_data)
            
            image_paths.append(filename)
            print(f"  ✓ Extracted: {filename} ({len(image_data):,} bytes)")
    
    return image_paths


def export_conversations(jsonl_files: List[str], output_dir: str) -> None:
    """Export conversations from JSONL files, organized by date."""
    
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Group conversations by date
    conversations_by_date = defaultdict(list)
    
    for jsonl_file in jsonl_files:
        print(f"\n📂 Processing: {jsonl_file}")
        
        with open(jsonl_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue
                
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError as e:
                    print(f"  ⚠️  Line {line_num}: Invalid JSON - {e}", file=sys.stderr)
                    continue
                
                # Extract requests from the entry
                requests = entry.get('v', {}).get('requests', [])
                source_name = entry.get('kind', 'chat').replace(' ', '-')
                
                if not requests:
                    continue
                
                # Process each conversation (message/response pair)
                for req in requests:
                    if not isinstance(req, dict):
                        continue
                    
                    # Extract timestamp
                    ts = req.get('timestamp')
                    conv_time = parse_timestamp(ts)
                    
                    if not conv_time:
                        print(f"  ⚠️  Skipping conversation without valid timestamp", file=sys.stderr)
                        continue
                    
                    date_key = conv_time.strftime('%Y-%m-%d')
                    
                    # Extract images from response
                    response = req.get('response', [])
                    images = extract_images_from_response(response, output_dir, f"{date_key}-{source_name}", conv_time)
                    
                    # Build conversation text
                    user_msg = req.get('message', '')
                    
                    # Extract text from response array
                    response_text = ''
                    if isinstance(response, list):
                        texts = []
                        for item in response:
                            if isinstance(item, dict) and 'value' in item:
                                val = item['value']
                                # Skip if this is just a base64 image holder
                                if isinstance(val, str):
                                    texts.append(val)
                        response_text = ''.join(texts)
                    
                    conversation = {
                        'timestamp': conv_time,
                        'date_key': date_key,
                        'user': user_msg,
                        'response': response_text,
                        'images': images,
                        'source': source_name
                    }
                    
                    conversations_by_date[date_key].append(conversation)
    
    # Write output files organized by date
    print(f"\n💾 Writing export files...\n")
    
    total_conversations = 0
    total_images = 0
    
    for date_key in sorted(conversations_by_date.keys()):
        convs = conversations_by_date[date_key]
        total_conversations += len(convs)
        
        # Get source from first conversation for filename
        source = convs[0]['source'] if convs else 'chat'
        output_file = os.path.join(output_dir, f"{date_key}-{source}_export.txt")
        
        # Collect all images for this date
        all_images = set()
        for conv in convs:
            all_images.update(conv['images'])
        
        total_images += len(all_images)
        
        # Write export file
        with open(output_file, 'w') as f:
            f.write("CHAT SESSION EXPORT\n")
            f.write("=" * 70 + "\n")
            f.write(f"Source: {source}\n")
            f.write(f"Date: {date_key}\n")
            f.write(f"Conversations: {len(convs)}\n")
            f.write(f"Images: {len(all_images)}\n")
            f.write(f"Exported: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 70 + "\n\n")
            
            if all_images:
                f.write("📁 IMAGES IN THIS SESSION:\n")
                for img in sorted(all_images):
                    f.write(f"  • {img}\n")
                f.write("\n" + "=" * 70 + "\n\n")
            
            # Write conversations
            for i, conv in enumerate(convs, 1):
                f.write(f"━━━ CONVERSATION {i} ━━━\n")
                f.write(f"[{conv['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}]\n\n")
                
                f.write("USER:\n")
                f.write("-" * 70 + "\n")
                f.write(conv['user'] + "\n\n")
                
                f.write("AI:\n")
                f.write("-" * 70 + "\n")
                f.write(conv['response'] + "\n\n")
        
        file_size = os.path.getsize(output_file) / 1024
        print(f"✓ {os.path.basename(output_file)} ({file_size:.1f} KB, {len(convs)} conversations)")
    
    # Print summary
    print(f"\n{'=' * 70}")
    print(f"✅ Export Complete!")
    print(f"   • Conversations: {total_conversations}")
    print(f"   • Images: {total_images}")
    print(f"   • Output: {output_dir}")
    print(f"{'=' * 70}\n")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Export chat history from JSONL files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Export from single file
  python3 scripts/export-chat-history.py \\
    --input chat-history/main.jsonl \\
    --output /tmp/exports
  
  # Export from multiple files
  python3 scripts/export-chat-history.py \\
    --input chat-history/main.jsonl chat-history/fork.jsonl \\
    --output /tmp/exports
        '''
    )
    
    parser.add_argument(
        '--input',
        nargs='+',
        required=True,
        help='JSONL file(s) to export'
    )
    parser.add_argument(
        '--output',
        default='/tmp/chat_exports',
        help='Output directory (default: /tmp/chat_exports)'
    )
    
    args = parser.parse_args()
    
    # Validate input files
    for f in args.input:
        if not os.path.exists(f):
            print(f"❌ Error: File not found: {f}", file=sys.stderr)
            sys.exit(1)
    
    try:
        export_conversations(args.input, args.output)
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
