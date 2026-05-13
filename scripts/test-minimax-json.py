import json, urllib.request, urllib.error, re, sys

prompt = """请根据以下家庭画像，为这个家庭推荐任务和习惯。

家庭信息：
- 家庭类型：核心家庭
- 孩子数量：1
孩子1：
  - 年龄：8岁
  - 性别：男
  - 年级：小学三年级
  - 上学时间：08:00-16:00
  - 课外活动：游泳、编程
  - 参加托管班：否

家长优先关注：
- 学习习惯
- 健康生活

请返回以下 JSON 格式（只返回 JSON，不要包含其他文字）：
{
  "tasks": [
    {
      "name": "任务名称",
      "reason": "为什么推荐这个任务",
      "frequency": "daily/weekly",
      "rewardStars": 5,
      "category": "学习习惯",
      "suggestedTime": "放学后"
    }
  ],
  "habits": [
    {
      "name": "习惯名称",
      "reason": "为什么推荐这个习惯",
      "targetDays": 21,
      "category": "习惯养成"
    }
  ]
}

要求：
1. 推荐 6-10 个任务，3-5 个习惯
2. 必须结合孩子的年龄、年级、课外活动情况
3. 根据家长关注的优先级侧重相关任务
4. 任务要具体、可操作，适合孩子年龄
5. 奖励星星数要合理"""

system_prompt = """你是专业的家庭教育顾问，擅长根据孩子的年龄、性格和家庭情况推荐合适的任务和习惯。你推荐的任务具体、可操作、符合儿童发展规律。

重要规则：
- 必须返回标准的 JSON 格式，不能包含 JSON 之外的任何文字
- 任务名称要简短明了（不超过10个字）
- 原因要结合家庭实际情况，不要通用模板"""

body = json.dumps({
    'model': 'MiniMax-M2.7',
    'messages': [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': prompt + '\n\n请以JSON格式回复，不要包含其他文字。'}
    ],
    'temperature': 0.9,
    'max_tokens': 2048,
}, ensure_ascii=False)

req = urllib.request.Request(
    'https://api.minimax.chat/v1/text/chatcompletion_v2',
    data=body.encode('utf-8'),
    headers={
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-cp-2cbl5k2srpadY_kjZDOEdWiOfq9ejdBNNGHiJWWy06rpob1m4Qe0gkDt95ga4--_0fWbJWWdN7pLNs--wvEZFRfFRWtY9tA59pTOTEpMaTByTWLgmwoLH2A',
    },
    method='POST',
)

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        content = data['choices'][0]['message']['content']
        print('=== RAW CONTENT (first 800 chars) ===')
        print(content[:800])
        print('...')
        print('=== Full length:', len(content), 'chars ===')
        
        # Try direct JSON parse
        try:
            parsed = json.loads(content)
            print('\nValid JSON: YES')
            print('Tasks:', len(parsed.get('tasks', [])))
            print('Habits:', len(parsed.get('habits', [])))
            if parsed.get('tasks'):
                print('First task:', json.dumps(parsed['tasks'][0], ensure_ascii=False)[:200])
            sys.exit(0)
        except json.JSONDecodeError as e:
            print('\nDirect JSON parse FAILED:', e)
        
        # Try to extract JSON from markdown code blocks
        m = re.search(r'```(?:json)?\s*([\s\S]*?)```', content)
        if m:
            print('Found markdown code block!')
            try:
                parsed = json.loads(m.group(1))
                print('Content inside code block is valid JSON!')
                print('Tasks:', len(parsed.get('tasks', [])))
                print('Habits:', len(parsed.get('habits', [])))
                sys.exit(0)
            except json.JSONDecodeError as e2:
                print('Still not valid:', e2)
        else:
            # Try other patterns
            print('No standard markdown. Looking for any JSON-like content...')
            # Find first { and last }
            start = content.find('{')
            end = content.rfind('}')
            if start >= 0 and end > start:
                json_str = content[start:end+1]
                print('Extracted from', start, 'to', end)
                try:
                    parsed = json.loads(json_str)
                    print('Valid JSON after extraction!')
                    print('Tasks:', len(parsed.get('tasks', [])))
                    print('Habits:', len(parsed.get('habits', [])))
                    sys.exit(0)
                except json.JSONDecodeError as e3:
                    print('Still fails:', e3)
        
        print('\nCould not extract valid JSON from response')
        sys.exit(1)
        
except urllib.error.HTTPError as e:
    print('HTTP Error:', e.code, e.read().decode('utf-8')[:500])
except Exception as e:
    print('Error:', e)
