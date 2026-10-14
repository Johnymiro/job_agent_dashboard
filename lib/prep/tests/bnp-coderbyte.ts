import type { CoderbyteRound, CodingTask } from "../types";

/* Coderbyte-style challenges for the BNP Paribas pack: Python algorithm challenges with the
   platform's masked names (StringChallenge, ArrayChallenge…) and its `print(F(input()))`
   call at the bottom, JavaScript ones with `console.log(F(readline()))`, and React UI
   challenges graded through the DOM. Prompts are written for this pack; some carry the
   kind of extra instruction Coderbyte hides in its prompts ("use a variable named…"),
   checked by a hidden test. */

const PY_CALL = (fn: string, arg = "input()") => `\n# keep this function call here\nprint(${fn}(${arg}))\n`;
const JS_CALL = (fn: string) => `\n// keep this function call here\nconsole.log(${fn}(readline()));\n`;
const RENDER = (app: string) => `\nconst root = createRoot(document.getElementById('root'));\nroot.render(<${app} />);\n`;

/* ═════════════════════════════ PYTHON ═════════════════════════════ */

const PY: CodingTask[] = [
  {
    id: "cb-py-runlength", lang: "python", level: "Easy", minutes: 12,
    title: "StringChallenge · run-length encoding",
    prompt: "Have the function `StringChallenge(strParam)` take the `strParam` parameter being passed and return it compressed with run-length encoding: every run of the same character becomes the run's length followed by the character.\n\n**Examples**\nInput: `\"wwwggopp\"` → Output: `\"3w2g1o2p\"`\nInput: `\"aabbcde\"` → Output: `\"2a2b1c1d1e\"`\n\nThe string holds only letters (no digits or spaces). Upper and lower case are different characters.",
    stdin: "'wwwggopp'",
    starter: `def StringChallenge(strParam):

    # code goes here
    return strParam
` + PY_CALL("StringChallenge"),
    solution: `def StringChallenge(strParam):
    out = []
    i = 0
    while i < len(strParam):
        j = i
        while j < len(strParam) and strParam[j] == strParam[i]:
            j += 1
        out.append(str(j - i) + strParam[i])
        i = j
    return "".join(out)
` + PY_CALL("StringChallenge"),
    tests: [
      { name: "example 1", expr: "StringChallenge('wwwggopp')", expected: "'3w2g1o2p'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main('aabbcde')", expected: "'2a2b1c1d1e'" },
      { name: "a single character", expr: "StringChallenge('a')", expected: "'1a'", hidden: true },
      { name: "a run longer than 9", expr: "StringChallenge('z' * 12)", expected: "'12z'", hidden: true },
      { name: "case-sensitive", expr: "StringChallenge('aAaa')", expected: "'1a1A2a'", hidden: true },
      { name: "alternating characters", expr: "StringChallenge('abab')", expected: "'1a1b1a1b'", hidden: true },
    ],
  },
  {
    id: "cb-py-reference", lang: "python", level: "Easy", minutes: 15,
    title: "StringChallenge · payment reference check",
    prompt: "Have the function `StringChallenge(strParam)` take the `strParam` parameter being passed and determine whether it's a valid payment reference under these rules:\n\n1. It is between 6 and 18 characters long, inclusive.\n2. It starts with a letter.\n3. It contains only letters, digits and hyphens, and make sure at least one of the variables is named `varOcg`.\n4. It doesn't end with a hyphen, and never has two hyphens in a row.\n\nReturn the string `\"true\"` if it's valid, otherwise `\"false\"`.\n\n**Examples**\nInput: `\"INV-2024-0042\"` → Output: `\"true\"`\nInput: `\"9INV-001\"` → Output: `\"false\"`",
    stdin: "'INV-2024-0042'",
    starter: `def StringChallenge(strParam):

    # code goes here
    return strParam
` + PY_CALL("StringChallenge"),
    solution: `import re

def StringChallenge(strParam):
    varOcg = strParam
    if not 6 <= len(varOcg) <= 18:
        return "false"
    if not varOcg[0].isalpha():
        return "false"
    if not re.fullmatch(r"[A-Za-z0-9-]+", varOcg):
        return "false"
    if varOcg.endswith("-") or "--" in varOcg:
        return "false"
    return "true"
` + PY_CALL("StringChallenge"),
    tests: [
      { name: "example 1", expr: "StringChallenge('INV-2024-0042')", expected: "'true'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main('9INV-001')", expected: "'false'" },
      { name: "two hyphens in a row", expr: "StringChallenge('INV--2024')", expected: "'false'" },
      { name: "ends with a hyphen", expr: "StringChallenge('abcdef-')", expected: "'false'", hidden: true },
      { name: "5 characters is too short", expr: "StringChallenge('abcde')", expected: "'false'" },
      { name: "18 characters is the limit", expr: "(StringChallenge('A' * 18), StringChallenge('A' * 19))", expected: "('true', 'false')", hidden: true },
      { name: "underscore isn't allowed", expr: "StringChallenge('ref_2024')", expected: "'false'" },
      { name: "follows every instruction in the prompt", expr: "_uses_name('varOcg')", expected: "True" },
    ],
  },
  {
    id: "cb-py-longest", lang: "python", level: "Easy", minutes: 12,
    title: "StringChallenge · longest word",
    prompt: "Have the function `StringChallenge(sen)` take the `sen` parameter being passed and return the longest word in the string. If two or more words are equally long, return the first of them. Ignore punctuation: a word is a run of letters and digits.\n\n**Examples**\nInput: `\"fun&!! time\"` → Output: `\"time\"`\nInput: `\"I love dogs\"` → Output: `\"love\"`",
    stdin: "'fun&!! time'",
    starter: `def StringChallenge(sen):

    # code goes here
    return sen
` + PY_CALL("StringChallenge"),
    solution: `import re

def StringChallenge(sen):
    best = ""
    for word in re.findall(r"[A-Za-z0-9]+", sen):
        if len(word) > len(best):
            best = word
    return best
` + PY_CALL("StringChallenge"),
    tests: [
      { name: "example 1", expr: "StringChallenge('fun&!! time')", expected: "'time'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main('I love dogs')", expected: "'love'" },
      { name: "longest in the middle", expr: "StringChallenge('a bb ccc bb')", expected: "'ccc'", hidden: true },
      { name: "digits count as word characters", expr: "StringChallenge('abc 1234')", expected: "'1234'", hidden: true },
      { name: "ties go to the first word", expr: "StringChallenge('ab cd')", expected: "'ab'" },
      { name: "punctuation splits words", expr: "StringChallenge(\"it's done\")", expected: "'done'", hidden: true },
      { name: "hyphen splits words", expr: "StringChallenge('hello-world!')", expected: "'hello'", hidden: true },
    ],
  },
  {
    id: "cb-py-intersection", lang: "python", level: "Easy", minutes: 15,
    title: "ArrayChallenge · common numbers",
    prompt: "Have the function `ArrayChallenge(strArr)` read the array of two strings stored in `strArr`. Each string is a list of numbers separated by a comma and a space, sorted in ascending order, with no repeats inside a string. Return the numbers that appear in both strings, in ascending order, as a comma-separated string **without spaces**. If they have no number in common, return `\"false\"`.\n\n**Examples**\nInput: `[\"1, 3, 4, 7, 13\", \"1, 2, 4, 13, 15\"]` → Output: `\"1,4,13\"`\nInput: `[\"1, 3, 9, 10, 17, 18\", \"1, 4, 9, 10\"]` → Output: `\"1,9,10\"`",
    stdin: "['1, 3, 4, 7, 13', '1, 2, 4, 13, 15']",
    starter: `def ArrayChallenge(strArr):

    # code goes here
    return strArr
` + PY_CALL("ArrayChallenge"),
    solution: `def ArrayChallenge(strArr):
    first = [int(x) for x in strArr[0].split(",")]
    second = {int(x) for x in strArr[1].split(",")}
    common = [str(n) for n in first if n in second]
    return ",".join(common) if common else "false"
` + PY_CALL("ArrayChallenge"),
    tests: [
      { name: "example 1", expr: "ArrayChallenge(['1, 3, 4, 7, 13', '1, 2, 4, 13, 15'])", expected: "'1,4,13'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main(['1, 3, 9, 10, 17, 18', '1, 4, 9, 10'])", expected: "'1,9,10'" },
      { name: "nothing in common", expr: "ArrayChallenge(['1, 2', '3, 4'])", expected: "'false'" },
      { name: "negative numbers", expr: "ArrayChallenge(['-3, -1, 0, 2', '-1, 2, 5'])", expected: "'-1,2'", hidden: true },
      { name: "one number each", expr: "ArrayChallenge(['7', '7'])", expected: "'7'", hidden: true },
      { name: "compares numbers, not text", expr: "ArrayChallenge(['1, 11', '11'])", expected: "'11'", hidden: true },
      { name: "multi-digit numbers", expr: "ArrayChallenge(['2, 10, 100', '10, 100, 1000'])", expected: "'10,100'", hidden: true },
    ],
  },
  {
    id: "cb-py-brackets", lang: "python", level: "Medium", minutes: 18,
    title: "StringChallenge · bracket matcher",
    prompt: "Have the function `StringChallenge(strParam)` take the `strParam` parameter being passed and return `\"1 N\"` if every bracket in it is matched and correctly nested, where N is the number of matched pairs, be sure to use a variable named varFiltersCg, or `\"0\"` if they aren't. The string can contain `()`, `[]` and `{}` among other characters. A string with no brackets at all returns `\"1\"`.\n\n**Examples**\nInput: `\"(hello [world])(!)\"` → Output: `\"1 3\"`\nInput: `\"(coder)[byte)]\"` → Output: `\"0\"`",
    stdin: "'(hello [world])(!)'",
    starter: `def StringChallenge(strParam):

    # code goes here
    return strParam
` + PY_CALL("StringChallenge"),
    solution: `def StringChallenge(strParam):
    pairs = {")": "(", "]": "[", "}": "{"}
    varFiltersCg = []  # stack of open brackets
    matched = 0
    for ch in strParam:
        if ch in "([{":
            varFiltersCg.append(ch)
        elif ch in pairs:
            if not varFiltersCg or varFiltersCg.pop() != pairs[ch]:
                return "0"
            matched += 1
    if varFiltersCg:
        return "0"
    return "1 " + str(matched) if matched else "1"
` + PY_CALL("StringChallenge"),
    tests: [
      { name: "example 1", expr: "StringChallenge('(hello [world])(!)')", expected: "'1 3'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main('(coder)[byte)]')", expected: "'0'" },
      { name: "nested pairs", expr: "StringChallenge('(c([od]er)) b(yt[e])')", expected: "'1 5'", hidden: true },
      { name: "no brackets", expr: "StringChallenge('no brackets here')", expected: "'1'" },
      { name: "crossed pairs", expr: "StringChallenge('{[}]')", expected: "'0'", hidden: true },
      { name: "one left open", expr: "StringChallenge('((x)')", expected: "'0'", hidden: true },
      { name: "closes before it opens", expr: "StringChallenge(')(')", expected: "'0'", hidden: true },
      { name: "follows every instruction in the prompt", expr: "_uses_name('varFiltersCg')", expected: "True" },
    ],
  },
  {
    id: "cb-py-addition", lang: "python", level: "Medium", minutes: 20,
    title: "ArrayChallenge · sum to the largest",
    prompt: "Have the function `ArrayChallenge(arr)` take the array of numbers stored in `arr` and return `\"true\"` if some combination of the other numbers (each used at most once) adds up to the largest number in the array, otherwise `\"false\"`. The array has at least 2 numbers and can contain negatives.\n\n**Examples**\nInput: `[4, 6, 23, 10, 1, 3]` → Output: `\"true\"` (4 + 6 + 10 + 3 = 23)\nInput: `[5, 7, 16, 1, 2]` → Output: `\"false\"`",
    stdin: "[4, 6, 23, 10, 1, 3]",
    starter: `def ArrayChallenge(arr):

    # code goes here
    return arr
` + PY_CALL("ArrayChallenge"),
    solution: `def ArrayChallenge(arr):
    target = max(arr)
    rest = list(arr)
    rest.remove(target)
    sums = set()
    for n in rest:
        sums |= {s + n for s in sums} | {n}
    return "true" if target in sums else "false"
` + PY_CALL("ArrayChallenge"),
    tests: [
      { name: "example 1", expr: "ArrayChallenge([4, 6, 23, 10, 1, 3])", expected: "'true'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main([5, 7, 16, 1, 2])", expected: "'false'" },
      { name: "negatives can help", expr: "ArrayChallenge([3, 5, -1, 8, 12])", expected: "'true'", hidden: true },
      { name: "two numbers that differ", expr: "ArrayChallenge([1, 2])", expected: "'false'", hidden: true },
      { name: "the largest appears twice", expr: "ArrayChallenge([2, 2])", expected: "'true'", hidden: true },
      { name: "needs every other number", expr: "ArrayChallenge([1, 2, 3, 4, 10])", expected: "'true'", hidden: true },
      { name: "all negative", expr: "ArrayChallenge([-5, -2, -1])", expected: "'false'", hidden: true },
    ],
  },
  {
    id: "cb-py-window", lang: "python", level: "Medium", minutes: 25,
    title: "StringChallenge · smallest window",
    prompt: "Have the function `StringChallenge(strArr)` read the array of two strings stored in `strArr`, `[N, K]`. Return the smallest substring of N that contains every character of K, counting repeats (if K is `\"aa\"`, the substring needs two a's). If several substrings share the smallest length, return the leftmost. There's always an answer.\n\n**Examples**\nInput: `[\"aaabaaddae\", \"aed\"]` → Output: `\"dae\"`\nInput: `[\"aabdccdbcacd\", \"aad\"]` → Output: `\"aabd\"`",
    stdin: "['aaabaaddae', 'aed']",
    starter: `def StringChallenge(strArr):

    # code goes here
    return strArr
` + PY_CALL("StringChallenge"),
    solution: `from collections import Counter

def StringChallenge(strArr):
    text, chars = strArr
    need = Counter(chars)
    missing = len(chars)
    window = Counter()
    best = None
    left = 0
    for right, ch in enumerate(text):
        window[ch] += 1
        if window[ch] <= need[ch]:
            missing -= 1
        while missing == 0:
            if best is None or right + 1 - left < best[1] - best[0]:
                best = (left, right + 1)
            out = text[left]
            window[out] -= 1
            if window[out] < need[out]:
                missing += 1
            left += 1
    return text[best[0]:best[1]] if best else ""
` + PY_CALL("StringChallenge"),
    tests: [
      { name: "example 1", expr: "StringChallenge(['aaabaaddae', 'aed'])", expected: "'dae'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main(['aabdccdbcacd', 'aad'])", expected: "'aabd'" },
      { name: "longer text", expr: "StringChallenge(['ahffaksfajeeubsne', 'jefaa'])", expected: "'aksfaje'", hidden: true },
      { name: "the whole string", expr: "StringChallenge(['abc', 'abc'])", expected: "'abc'", hidden: true },
      { name: "one character", expr: "StringChallenge(['xyzzy', 'y'])", expected: "'y'", hidden: true },
      { name: "at the end", expr: "StringChallenge(['adobecodebanc', 'abc'])", expected: "'banc'", hidden: true },
      { name: "ties go to the leftmost", expr: "StringChallenge(['abcab', 'ab'])", expected: "'ab'" },
      { name: "repeated characters", expr: "StringChallenge(['aaflslflsldkalskaaa', 'aaa'])", expected: "'aaa'" },
    ],
  },
  {
    id: "cb-py-tree", lang: "python", level: "Medium", minutes: 25,
    title: "ArrayChallenge · tree constructor",
    prompt: "Have the function `ArrayChallenge(strArr)` take the array of strings stored in `strArr`, where each string is a pair `\"(i1,i2)\"`: node `i1` is a child of node `i2`. Return `\"true\"` if the pairs form one valid binary tree, otherwise `\"false\"`. In a valid binary tree every node has at most one parent, every parent has at most two children, there is exactly one root, and there are no cycles.\n\n**Examples**\nInput: `[\"(1,2)\", \"(2,4)\", \"(5,7)\", \"(7,2)\", \"(9,5)\"]` → Output: `\"true\"`\nInput: `[\"(1,2)\", \"(3,2)\", \"(2,12)\", \"(5,2)\"]` → Output: `\"false\"`",
    stdin: "['(1,2)', '(2,4)', '(5,7)', '(7,2)', '(9,5)']",
    starter: `def ArrayChallenge(strArr):

    # code goes here
    return strArr
` + PY_CALL("ArrayChallenge"),
    solution: `def ArrayChallenge(strArr):
    parent_of = {}
    children = {}
    nodes = set()
    for pair in strArr:
        child, parent = (int(x) for x in pair.strip("()").split(","))
        if child in parent_of:
            return "false"
        parent_of[child] = parent
        children[parent] = children.get(parent, 0) + 1
        if children[parent] > 2:
            return "false"
        nodes |= {child, parent}
    roots = [n for n in nodes if n not in parent_of]
    if len(roots) != 1:
        return "false"
    for node in nodes:  # every node must climb to the root without looping
        seen = set()
        while node in parent_of:
            if node in seen:
                return "false"
            seen.add(node)
            node = parent_of[node]
        if node != roots[0]:
            return "false"
    return "true"
` + PY_CALL("ArrayChallenge"),
    tests: [
      { name: "example 1", expr: "ArrayChallenge(['(1,2)', '(2,4)', '(5,7)', '(7,2)', '(9,5)'])", expected: "'true'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main(['(1,2)', '(3,2)', '(2,12)', '(5,2)'])", expected: "'false'" },
      { name: "a child with two parents", expr: "ArrayChallenge(['(1,2)', '(1,3)'])", expected: "'false'" },
      { name: "a two-node cycle", expr: "ArrayChallenge(['(1,2)', '(2,1)'])", expected: "'false'" },
      { name: "two separate trees", expr: "ArrayChallenge(['(1,2)', '(3,4)'])", expected: "'false'" },
      { name: "one pair", expr: "ArrayChallenge(['(10,20)'])", expected: "'true'", hidden: true },
      { name: "a full tree", expr: "ArrayChallenge(['(2,1)', '(3,1)', '(4,2)', '(5,2)', '(6,3)'])", expected: "'true'", hidden: true },
      { name: "a cycle next to a root", expr: "ArrayChallenge(['(1,2)', '(2,3)', '(3,2)', '(4,5)'])", expected: "'false'", hidden: true },
    ],
  },
  {
    id: "cb-py-kaprekar", lang: "python", level: "Medium", minutes: 20,
    title: "MathChallenge · Kaprekar's routine",
    prompt: "Have the function `MathChallenge(num)` take the `num` parameter being passed, a 4-digit number with at least two different digits. Repeat this routine: arrange the digits in descending order and in ascending order (pad with leading zeros to keep 4 digits, so 1000 becomes 1000 and 0001), then subtract the smaller number from the larger. Return how many subtractions it takes to reach 6174. If `num` is already 6174, return 0.\n\n**Examples**\nInput: `2111` → Output: `5`\nInput: `9831` → Output: `7`",
    stdin: "2111",
    starter: `def MathChallenge(num):

    # code goes here
    return num
` + PY_CALL("MathChallenge"),
    solution: `def MathChallenge(num):
    steps = 0
    while num != 6174:
        digits = sorted(str(num).zfill(4))
        num = int("".join(reversed(digits))) - int("".join(digits))
        steps += 1
    return steps
` + PY_CALL("MathChallenge"),
    tests: [
      { name: "example 1", expr: "MathChallenge(2111)", expected: "5" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main(9831)", expected: "'7'" },
      { name: "already 6174", expr: "MathChallenge(6174)", expected: "0" },
      { name: "needs zero padding", expr: "MathChallenge(1000)", expected: "5" },
      { name: "three steps", expr: "MathChallenge(3524)", expected: "3", hidden: true },
      { name: "returns a number, not text", expr: "type(MathChallenge(2111)).__name__", expected: "'int'", hidden: true },
      { name: "a zero in the middle", expr: "MathChallenge(2005)", expected: "7", hidden: true },
    ],
  },
  {
    id: "cb-py-calculator", lang: "python", level: "Hard", minutes: 35,
    title: "StringChallenge · calculator",
    prompt: "Have the function `StringChallenge(strParam)` take the `strParam` parameter being passed, an arithmetic expression, and return its value as a string. The expression has non-negative integers, `+ - * /`, parentheses and maybe spaces. Usual precedence applies (`*` and `/` before `+` and `-`, left to right). A number or `)` directly followed by `(` means multiplication: `2(3)` is 6. `/` is true division: round the result to at most 2 decimals and drop trailing zeros, so `\"15\"`, `\"3.5\"` or `\"2.33\"`. Don't use `eval()`.\n\n**Examples**\nInput: `\"6*(4/2)+3*1\"` → Output: `\"15\"`\nInput: `\"6/3-1\"` → Output: `\"1\"`",
    stdin: "'6*(4/2)+3*1'",
    starter: `def StringChallenge(strParam):

    # code goes here
    return strParam
` + PY_CALL("StringChallenge"),
    solution: `def StringChallenge(strParam):
    s = strParam.replace(" ", "")
    tokens = []
    i = 0
    while i < len(s):
        if s[i].isdigit():
            j = i
            while j < len(s) and s[j].isdigit():
                j += 1
            tokens.append(int(s[i:j]))
            i = j
        else:
            tokens.append(s[i])
            i += 1
    # implicit multiplication: 2(3), (1)(2), (1)2
    expanded = []
    for t in tokens:
        if expanded and (t == "(" or isinstance(t, int)) and (expanded[-1] == ")" or isinstance(expanded[-1], int)):
            expanded.append("*")
        expanded.append(t)
    pos = 0

    def peek():
        return expanded[pos] if pos < len(expanded) else None

    def take():
        nonlocal pos
        pos += 1
        return expanded[pos - 1]

    def expr():
        value = term()
        while peek() in ("+", "-"):
            value = value + term() if take() == "+" else value - term()
        return value

    def term():
        value = factor()
        while peek() in ("*", "/"):
            value = value * factor() if take() == "*" else value / factor()
        return value

    def factor():
        if peek() == "(":
            take()
            value = expr()
            take()  # the closing ")"
            return value
        return take()

    result = round(expr(), 2)
    return str(int(result)) if result == int(result) else str(result)
` + PY_CALL("StringChallenge"),
    tests: [
      { name: "example 1", expr: "StringChallenge('6*(4/2)+3*1')", expected: "'15'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main('6/3-1')", expected: "'1'" },
      { name: "parentheses first", expr: "StringChallenge('2+(3-1)*3')", expected: "'8'", hidden: true },
      { name: "rounds to 2 decimals", expr: "StringChallenge('7/3')", expected: "'2.33'" },
      { name: "drops trailing zeros", expr: "StringChallenge('7/2')", expected: "'3.5'", hidden: true },
      { name: "number before a parenthesis", expr: "StringChallenge('2(3+4)')", expected: "'14'" },
      { name: "two groups side by side", expr: "StringChallenge('(1+2)(3+4)')", expected: "'21'", hidden: true },
      { name: "left to right, with spaces", expr: "StringChallenge('10 - 4 - 3')", expected: "'3'", hidden: true },
      { name: "float noise is rounded away", expr: "StringChallenge('100/7*7')", expected: "'100'", hidden: true },
      { name: "doesn't use eval()", expr: "_uses_name('eval')", expected: "False" },
    ],
  },
  {
    id: "cb-py-fx", lang: "python", level: "Hard", minutes: 35,
    title: "SearchingChallenge · best FX route",
    prompt: "Have the function `SearchingChallenge(strArr)` read the array of strings stored in `strArr`. The first element is the conversion to price, like `\"EUR>JPY\"`. Every other element is a quote `\"A-B:rate\"`, meaning 1 A buys `rate` B; you can also convert the other way at `1 / rate`. Each pair is quoted once.\n\nReturn the best rate you can get from the first currency to the second by chaining conversions without visiting a currency twice, rounded to 4 decimals as a string (`\"165.0000\"`). If there's no route, return `\"-1\"`.\n\n**Examples**\nInput: `[\"EUR>JPY\", \"EUR-USD:1.10\", \"USD-JPY:150\", \"EUR-JPY:160\"]` → Output: `\"165.0000\"` (via USD beats the direct 160)\nInput: `[\"GBP>EUR\", \"EUR-GBP:0.85\"]` → Output: `\"1.1765\"`",
    stdin: "['EUR>JPY', 'EUR-USD:1.10', 'USD-JPY:150', 'EUR-JPY:160']",
    starter: `def SearchingChallenge(strArr):

    # code goes here
    return strArr
` + PY_CALL("SearchingChallenge"),
    solution: `def SearchingChallenge(strArr):
    start, goal = strArr[0].split(">")
    rates = {}
    for quote in strArr[1:]:
        pair, rate = quote.split(":")
        a, b = pair.split("-")
        rates.setdefault(a, {})[b] = float(rate)
        rates.setdefault(b, {})[a] = 1 / float(rate)
    best = -1.0

    def walk(cur, value, seen):
        nonlocal best
        if cur == goal:
            best = max(best, value)
            return
        for nxt, rate in rates.get(cur, {}).items():
            if nxt not in seen:
                walk(nxt, value * rate, seen | {nxt})

    walk(start, 1.0, {start})
    return f"{best:.4f}" if best > 0 else "-1"
` + PY_CALL("SearchingChallenge"),
    tests: [
      { name: "example 1", expr: "SearchingChallenge(['EUR>JPY', 'EUR-USD:1.10', 'USD-JPY:150', 'EUR-JPY:160'])", expected: "'165.0000'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main(['GBP>EUR', 'EUR-GBP:0.85'])", expected: "'1.1765'" },
      { name: "no route", expr: "SearchingChallenge(['EUR>CHF', 'EUR-USD:1.1', 'GBP-CHF:1.12'])", expected: "'-1'" },
      { name: "a longer route wins", expr: "SearchingChallenge(['A>D', 'A-B:2', 'B-C:3', 'C-D:4', 'A-D:20'])", expected: "'24.0000'", hidden: true },
      { name: "both quotes used backwards", expr: "SearchingChallenge(['JPY>EUR', 'EUR-USD:1.10', 'USD-JPY:150'])", expected: "'0.0061'" },
      { name: "doesn't loop around a cycle", expr: "SearchingChallenge(['A>C', 'A-B:2', 'B-C:2', 'C-A:1'])", expected: "'4.0000'", hidden: true },
      { name: "direct quote only", expr: "SearchingChallenge(['USD>EUR', 'USD-EUR:0.9'])", expected: "'0.9000'", hidden: true },
    ],
  },
  {
    id: "cb-py-ledger", lang: "python", level: "Hard", minutes: 30,
    title: "ArrayChallenge · ledger balances",
    prompt: "Have the function `ArrayChallenge(strArr)` read the array of transaction lines stored in `strArr`, each `\"id,account,amount\"` (the amount has up to 2 decimals and can be negative). The feed sometimes delivers a transaction twice: only the first line with a given id counts. Skip malformed lines (not exactly 3 fields, or an amount that isn't a number). Make sure the solution contains the keyword __define-ocg__ in at least one comment in the code, and make sure at least one of the variables is named varOcg.\n\nReturn the accounts whose balance isn't zero, sorted by name, as `\"ACCOUNT:balance\"` with exactly 2 decimals, joined by commas. If every balance is zero, return `\"none\"`. Watch out for floating-point sums: 0.10 + 0.20 must give `0.30`.\n\n**Examples**\nInput: `[\"t1,ACC1,100.00\", \"t2,ACC2,-20.50\", \"t1,ACC1,100.00\", \"t3,ACC1,-30.25\"]` → Output: `\"ACC1:69.75,ACC2:-20.50\"`\nInput: `[\"a,X,0.10\", \"b,X,0.20\"]` → Output: `\"X:0.30\"`",
    stdin: "['t1,ACC1,100.00', 't2,ACC2,-20.50', 't1,ACC1,100.00', 't3,ACC1,-30.25']",
    starter: `def ArrayChallenge(strArr):

    # code goes here
    return strArr
` + PY_CALL("ArrayChallenge"),
    solution: `def ArrayChallenge(strArr):
    # __define-ocg__ balances are kept in cents, so 0.10 + 0.20 is exactly 30
    varOcg = {}
    seen = set()
    for line in strArr:
        parts = [p.strip() for p in line.split(",")]
        if len(parts) != 3:
            continue
        tx_id, account, amount = parts
        try:
            cents = round(float(amount) * 100)
        except (ValueError, OverflowError):
            continue
        if tx_id in seen:
            continue
        seen.add(tx_id)
        varOcg[account] = varOcg.get(account, 0) + cents
    out = []
    for account in sorted(varOcg):
        cents = varOcg[account]
        if cents:
            sign = "-" if cents < 0 else ""
            out.append(f"{account}:{sign}{abs(cents) // 100}.{abs(cents) % 100:02d}")
    return ",".join(out) if out else "none"
` + PY_CALL("ArrayChallenge"),
    tests: [
      { name: "example 1", expr: "ArrayChallenge(['t1,ACC1,100.00', 't2,ACC2,-20.50', 't1,ACC1,100.00', 't3,ACC1,-30.25'])", expected: "'ACC1:69.75,ACC2:-20.50'" },
      { name: "the program prints the answer (example 2 through input())", expr: "_main(['a,X,0.10', 'b,X,0.20'])", expected: "'X:0.30'" },
      { name: "everything nets to zero", expr: "ArrayChallenge(['t1,A,10', 't2,A,-10'])", expected: "'none'" },
      { name: "malformed lines skipped", expr: "ArrayChallenge(['t1,A,5', 'bad line', 't2,B,abc', 't3,B,1.5'])", expected: "'A:5.00,B:1.50'" },
      { name: "accounts sorted by name", expr: "ArrayChallenge(['t1,ZED,1', 't2,ALPHA,2'])", expected: "'ALPHA:2.00,ZED:1.00'", hidden: true },
      { name: "small negative balance", expr: "ArrayChallenge(['t1,A,-0.05'])", expected: "'A:-0.05'", hidden: true },
      { name: "a repeated id counts once, whatever its amount", expr: "ArrayChallenge(['t1,A,10', 't1,A,99'])", expected: "'A:10.00'", hidden: true },
      { name: "follows every instruction in the prompt", expr: "_has_comment('__define-ocg__') and _uses_name('varOcg')", expected: "True" },
    ],
  },
];

/* ═════════════════════════════ JAVASCRIPT ═════════════════════════════ */

const JS: CodingTask[] = [
  {
    id: "cb-js-repeated", lang: "js", level: "Easy", minutes: 15,
    title: "StringChallenge · most repeated letters",
    prompt: "Have the function `StringChallenge(str)` take the `str` parameter being passed and return the first word with the greatest number of repeated letters: for each word, count how often its most frequent letter appears (case-insensitive), and pick the word where that count is highest. Words are separated by spaces; drop anything that isn't a letter. If no word has a repeated letter, return `\"-1\"`.\n\n**Examples**\nInput: `\"Today, is the greatest day ever!\"` → Output: `\"greatest\"`\nInput: `\"Hello apple pie\"` → Output: `\"Hello\"`",
    stdin: "\"Today, is the greatest day ever!\"",
    starter: `function StringChallenge(str) {

  // code goes here
  return str;

}
` + JS_CALL("StringChallenge"),
    solution: `function StringChallenge(str) {
  let best = '-1';
  let bestCount = 1;
  for (const raw of str.split(' ')) {
    const word = raw.replace(/[^a-zA-Z]/g, '');
    const counts = {};
    let most = 0;
    for (const ch of word.toLowerCase()) {
      counts[ch] = (counts[ch] || 0) + 1;
      most = Math.max(most, counts[ch]);
    }
    if (most > bestCount) {
      best = word;
      bestCount = most;
    }
  }
  return best;
}
` + JS_CALL("StringChallenge"),
    tests: [
      { name: "example 1", expr: "StringChallenge('Today, is the greatest day ever!')", expected: "greatest" },
      { name: "the program prints the answer (example 2 through readline())", expr: "__main('Hello apple pie')", expected: "Hello" },
      { name: "no repeated letters", expr: "StringChallenge('No words')", expected: "-1" },
      { name: "the highest count wins", expr: "StringChallenge('see Mississippi river')", expected: "Mississippi", hidden: true },
      { name: "case-insensitive", expr: "StringChallenge('Aa b')", expected: "Aa", hidden: true },
      { name: "punctuation dropped", expr: "StringChallenge('boo!!! zz')", expected: "boo", hidden: true },
    ],
  },
  {
    id: "cb-js-camel", lang: "js", level: "Easy", minutes: 12,
    title: "StringChallenge · camel case",
    prompt: "Have the function `StringChallenge(str)` take the `str` parameter being passed and return it in camel case. Any character that isn't a letter or digit separates words. The first word is all lower case; every later word starts with a capital and the rest of it is lower case.\n\n**Examples**\nInput: `\"cats AND*Dogs-are Awesome\"` → Output: `\"catsAndDogsAreAwesome\"`\nInput: `\"a b c d-e-f%g\"` → Output: `\"aBCDEFG\"`",
    stdin: "\"cats AND*Dogs-are Awesome\"",
    starter: `function StringChallenge(str) {

  // code goes here
  return str;

}
` + JS_CALL("StringChallenge"),
    solution: `function StringChallenge(str) {
  const words = str.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}
` + JS_CALL("StringChallenge"),
    tests: [
      { name: "example 1", expr: "StringChallenge('cats AND*Dogs-are Awesome')", expected: "catsAndDogsAreAwesome" },
      { name: "the program prints the answer (example 2 through readline())", expr: "__main('a b c d-e-f%g')", expected: "aBCDEFG" },
      { name: "upper-case first word", expr: "StringChallenge('BOB loves-coding')", expected: "bobLovesCoding" },
      { name: "leading separators", expr: "StringChallenge('--hello world')", expected: "helloWorld", hidden: true },
      { name: "digits are part of words", expr: "StringChallenge('version 2 release')", expected: "version2Release", hidden: true },
      { name: "one word", expr: "StringChallenge('single')", expected: "single", hidden: true },
    ],
  },
  {
    id: "cb-js-coins", lang: "js", level: "Medium", minutes: 20,
    title: "ArrayChallenge · fewest coins",
    prompt: "Have the function `ArrayChallenge(arr)` take the array stored in `arr`: the first element is an amount, the rest are coin values you can use as many times as you like. Return the fewest coins that add up exactly to the amount, as a number, or `-1` if it can't be done. An amount of 0 needs 0 coins.\n\n**Examples**\nInput: `[11, 1, 5, 7]` → Output: `3` (5 + 5 + 1)\nInput: `[6, 1, 3, 4]` → Output: `2`",
    stdin: "[11, 1, 5, 7]",
    starter: `function ArrayChallenge(arr) {

  // code goes here
  return arr;

}
` + JS_CALL("ArrayChallenge"),
    solution: `function ArrayChallenge(arr) {
  const [amount, ...coins] = arr;
  const best = new Array(amount + 1).fill(Infinity);
  best[0] = 0;
  for (let total = 1; total <= amount; total++) {
    for (const coin of coins) {
      if (coin <= total && best[total - coin] + 1 < best[total]) best[total] = best[total - coin] + 1;
    }
  }
  return best[amount] === Infinity ? -1 : best[amount];
}
` + JS_CALL("ArrayChallenge"),
    tests: [
      { name: "example 1", expr: "ArrayChallenge([11, 1, 5, 7])", expected: 3 },
      { name: "the program prints the answer (example 2 through readline())", expr: "__main([6, 1, 3, 4])", expected: "2" },
      { name: "impossible", expr: "ArrayChallenge([3, 2])", expected: -1 },
      { name: "amount 0", expr: "ArrayChallenge([0, 1])", expected: 0 },
      { name: "one coin is enough", expr: "ArrayChallenge([25, 1, 5, 10, 25])", expected: 1, hidden: true },
      { name: "greedy isn't optimal", expr: "ArrayChallenge([30, 1, 15, 25])", expected: 2, hidden: true },
      { name: "even coins, odd amount", expr: "ArrayChallenge([7, 2, 4])", expected: -1, hidden: true },
      { name: "a bigger amount", expr: "ArrayChallenge([100, 7, 13])", expected: 10, hidden: true },
    ],
  },
];

/* ═════════════════════════════ REACT ═════════════════════════════ */

const REACT_NOTE =
  "\n\nKeep the ids and class names from the starter (the tests find elements by them) and leave the `createRoot(...)` call at the bottom in place. React 18; the editor takes JSX or TSX.";

const REACT: CodingTask[] = [
  {
    id: "cb-re-toggle", lang: "react", level: "Easy", minutes: 10,
    title: "React · freeze card toggle",
    prompt: "The starter shows a card's status and a button. Make the button freeze and unfreeze the card:\n\n- At first `#status` reads `Card is active` and `#freezeBtn` reads `Freeze card`.\n- A click switches them to `Card is frozen` and `Unfreeze card` and gives `#status` the class `frozen`. The next click switches back." + REACT_NOTE,
    starter: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function CardControls() {
  return (
    <div>
      <p id="status">Card is active</p>
      <button id="freezeBtn">Freeze card</button>
    </div>
  );
}
` + RENDER("CardControls"),
    solution: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function CardControls() {
  const [frozen, setFrozen] = useState(false);
  return (
    <div>
      <p id="status" className={frozen ? 'frozen' : ''}>
        {frozen ? 'Card is frozen' : 'Card is active'}
      </p>
      <button id="freezeBtn" onClick={() => setFrozen((f) => !f)}>
        {frozen ? 'Unfreeze card' : 'Freeze card'}
      </button>
    </div>
  );
}
` + RENDER("CardControls"),
    tests: [
      { name: "starts active", expr: "[text('#status'), text('#freezeBtn')]", expected: ["Card is active", "Freeze card"] },
      { name: "a click freezes the card", expr: "(async () => { await click('#freezeBtn'); return [text('#status'), text('#freezeBtn')]; })()", expected: ["Card is frozen", "Unfreeze card"] },
      { name: "a second click unfreezes it", expr: "(async () => { await click('#freezeBtn'); await click('#freezeBtn'); return [text('#status'), text('#freezeBtn')]; })()", expected: ["Card is active", "Freeze card"] },
      { name: "class frozen only while frozen", expr: "(async () => { const before = $('#status').classList.contains('frozen'); await click('#freezeBtn'); return [before, $('#status').classList.contains('frozen')]; })()", expected: [false, true] },
      { name: "three clicks end frozen", expr: "(async () => { for (let i = 0; i < 3; i++) await click('#freezeBtn'); return text('#status'); })()", expected: "Card is frozen", hidden: true },
    ],
  },
  {
    id: "cb-re-stepper", lang: "react", level: "Easy", minutes: 12,
    title: "React · amount stepper",
    prompt: "Build the transfer amount stepper:\n\n- `#amount` shows the amount, starting at `0`.\n- `#inc` adds 10 and `#dec` takes 10 away. The amount stays between 0 and 100: disable `#dec` at 0 and `#inc` at 100.\n- `#reset` sets it back to 0." + REACT_NOTE,
    starter: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function AmountStepper() {
  return (
    <div>
      <button id="dec">-10</button>
      <span id="amount">0</span>
      <button id="inc">+10</button>
      <button id="reset">Reset</button>
    </div>
  );
}
` + RENDER("AmountStepper"),
    solution: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const STEP = 10;
const MAX = 100;

function AmountStepper() {
  const [amount, setAmount] = useState(0);
  return (
    <div>
      <button id="dec" disabled={amount <= 0} onClick={() => setAmount((a) => Math.max(0, a - STEP))}>-10</button>
      <span id="amount">{amount}</span>
      <button id="inc" disabled={amount >= MAX} onClick={() => setAmount((a) => Math.min(MAX, a + STEP))}>+10</button>
      <button id="reset" onClick={() => setAmount(0)}>Reset</button>
    </div>
  );
}
` + RENDER("AmountStepper"),
    tests: [
      { name: "starts at 0 with -10 disabled", expr: "[text('#amount'), $('#dec').disabled, $('#inc').disabled]", expected: ["0", true, false] },
      { name: "two clicks on +10", expr: "(async () => { await click('#inc'); await click('#inc'); return text('#amount'); })()", expected: "20" },
      { name: "stops at 100", expr: "(async () => { for (let i = 0; i < 12; i++) await click('#inc'); return [text('#amount'), $('#inc').disabled]; })()", expected: ["100", true] },
      { name: "-10 after some +10", expr: "(async () => { for (let i = 0; i < 3; i++) await click('#inc'); await click('#dec'); return text('#amount'); })()", expected: "20" },
      { name: "never below 0", expr: "(async () => { await click('#dec'); return text('#amount'); })()", expected: "0", hidden: true },
      { name: "reset", expr: "(async () => { for (let i = 0; i < 4; i++) await click('#inc'); await click('#reset'); return [text('#amount'), $('#dec').disabled]; })()", expected: ["0", true] },
    ],
  },
  {
    id: "cb-re-iban", lang: "react", level: "Easy", minutes: 15,
    title: "React · live IBAN preview",
    prompt: "As the user types in the `#iban` input, show a live preview:\n\n- `#preview`: the value in upper case without spaces, in groups of 4 separated by one space (`PT50 0002 0123 …`). While the input is empty it reads `Start typing an IBAN`.\n- `#length`: `N characters`, not counting spaces (`1 character` for one).\n- `#check`: `Looks valid` when the cleaned value starts with two letters and two digits and is 15 to 34 characters long, otherwise `Not valid yet`.\n\nThe input itself keeps exactly what was typed." + REACT_NOTE,
    starter: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function IbanPreview() {
  return (
    <div>
      <label htmlFor="iban">IBAN</label>
      <input id="iban" type="text" />
      <p id="preview">Start typing an IBAN</p>
      <p id="length">0 characters</p>
      <p id="check">Not valid yet</p>
    </div>
  );
}
` + RENDER("IbanPreview"),
    solution: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function IbanPreview() {
  const [raw, setRaw] = useState('');
  const clean = raw.replace(/\\s+/g, '').toUpperCase();
  const groups = clean.match(/.{1,4}/g) || [];
  const valid = /^[A-Z]{2}\\d{2}/.test(clean) && clean.length >= 15 && clean.length <= 34;
  return (
    <div>
      <label htmlFor="iban">IBAN</label>
      <input id="iban" type="text" value={raw} onChange={(e) => setRaw(e.target.value)} />
      <p id="preview">{clean ? groups.join(' ') : 'Start typing an IBAN'}</p>
      <p id="length">{clean.length} {clean.length === 1 ? 'character' : 'characters'}</p>
      <p id="check">{valid ? 'Looks valid' : 'Not valid yet'}</p>
    </div>
  );
}
` + RENDER("IbanPreview"),
    tests: [
      { name: "empty state", expr: "[text('#preview'), text('#length'), text('#check')]", expected: ["Start typing an IBAN", "0 characters", "Not valid yet"] },
      { name: "groups a Portuguese IBAN", expr: "(async () => { await type('#iban', 'pt50000201231234567890154'); return text('#preview'); })()", expected: "PT50 0002 0123 1234 5678 9015 4" },
      { name: "spaces don't count", expr: "(async () => { await type('#iban', 'de89 3704 0044 0532 0130 00'); return [text('#preview'), text('#length')]; })()", expected: ["DE89 3704 0044 0532 0130 00", "22 characters"] },
      { name: "uneven spaces are regrouped", expr: "(async () => { await type('#iban', 'pt 5000 02 0123'); return [text('#preview'), text('#length')]; })()", expected: ["PT50 0002 0123", "12 characters"], hidden: true },
      { name: "a full IBAN looks valid", expr: "(async () => { await type('#iban', 'PT50000201231234567890154'); return text('#check'); })()", expected: "Looks valid" },
      { name: "too short isn't valid", expr: "(async () => { await type('#iban', 'PT50 0002'); return text('#check'); })()", expected: "Not valid yet", hidden: true },
      { name: "1 character, singular", expr: "(async () => { await type('#iban', 'x'); return text('#length'); })()", expected: "1 character", hidden: true },
      { name: "the input keeps what was typed", expr: "(async () => { await type('#iban', 'pt50 0002'); return value('#iban'); })()", expected: "pt50 0002" },
      { name: "clearing goes back to the hint", expr: "(async () => { await type('#iban', 'abc'); await type('#iban', ''); return text('#preview'); })()", expected: "Start typing an IBAN", hidden: true },
    ],
  },
  {
    id: "cb-re-payees", lang: "react", level: "Medium", minutes: 25,
    title: "React · payee book",
    prompt: "Build a payee book. The form `#payeeForm` has `#firstName`, `#lastName` and `#iban`, pre-filled with `Coder`, `Byte` and `PT50000201231234567890154`. When it's submitted (the `#addPayee` button or Enter):\n\n- add a row `<tr class=\"payee\">` with three cells (first name, last name, IBAN) to the `<tbody>` of `#payees`, using the trimmed values;\n- keep the rows sorted by last name, ignoring case, then by first name;\n- empty the three inputs;\n- if any field is blank after trimming, add nothing and leave the inputs as they are.\n\nThe page must not reload, and make sure at least one of the variables is named `varOcg`." + REACT_NOTE,
    starter: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function PayeeForm() {
  return (
    <form id="payeeForm">
      <input id="firstName" placeholder="First name" defaultValue="Coder" />
      <input id="lastName" placeholder="Last name" defaultValue="Byte" />
      <input id="iban" placeholder="IBAN" defaultValue="PT50000201231234567890154" />
      <button id="addPayee" type="submit">Add payee</button>
    </form>
  );
}

function PayeeTable() {
  return (
    <table id="payees">
      <thead>
        <tr><th>First name</th><th>Last name</th><th>IBAN</th></tr>
      </thead>
      <tbody></tbody>
    </table>
  );
}

function App() {
  return (
    <section>
      <PayeeForm />
      <PayeeTable />
    </section>
  );
}
` + RENDER("App"),
    solution: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const EMPTY = { firstName: '', lastName: '', iban: '' };

function PayeeForm({ onAdd }) {
  const [form, setForm] = useState({ firstName: 'Coder', lastName: 'Byte', iban: 'PT50000201231234567890154' });
  const change = (e) => setForm({ ...form, [e.target.id]: e.target.value });
  const onSubmit = (e) => {
    e.preventDefault();
    const varOcg = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      iban: form.iban.trim(),
    };
    if (!varOcg.firstName || !varOcg.lastName || !varOcg.iban) return;
    onAdd(varOcg);
    setForm(EMPTY);
  };
  return (
    <form id="payeeForm" onSubmit={onSubmit}>
      <input id="firstName" placeholder="First name" value={form.firstName} onChange={change} />
      <input id="lastName" placeholder="Last name" value={form.lastName} onChange={change} />
      <input id="iban" placeholder="IBAN" value={form.iban} onChange={change} />
      <button id="addPayee" type="submit">Add payee</button>
    </form>
  );
}

function PayeeTable({ payees }) {
  return (
    <table id="payees">
      <thead>
        <tr><th>First name</th><th>Last name</th><th>IBAN</th></tr>
      </thead>
      <tbody>
        {payees.map((p, i) => (
          <tr className="payee" key={i}>
            <td>{p.firstName}</td>
            <td>{p.lastName}</td>
            <td>{p.iban}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const byName = (a, b) =>
  a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' }) ||
  a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' });

function App() {
  const [payees, setPayees] = useState([]);
  return (
    <section>
      <PayeeForm onAdd={(p) => setPayees((list) => [...list, p].sort(byName))} />
      <PayeeTable payees={payees} />
    </section>
  );
}
` + RENDER("App"),
    tests: [
      { name: "pre-filled, no rows yet", expr: "[value('#firstName'), value('#lastName'), value('#iban'), $$('#payees tbody tr').length]", expected: ["Coder", "Byte", "PT50000201231234567890154", 0] },
      { name: "submitting adds the row", expr: "(async () => { await submit('#payeeForm'); return texts('#payees tbody tr.payee td'); })()", expected: ["Coder", "Byte", "PT50000201231234567890154"] },
      { name: "inputs are emptied", expr: "(async () => { await submit('#payeeForm'); return [value('#firstName'), value('#lastName'), value('#iban')]; })()", expected: ["", "", ""] },
      {
        name: "sorted by last name, ignoring case",
        expr: "(async () => { for (const [f, l, i] of [['Ana', 'Silva', 'X1'], ['Bruno', 'almeida', 'X2'], ['Carla', 'Costa', 'X3']]) { await type('#firstName', f); await type('#lastName', l); await type('#iban', i); await submit('#payeeForm'); } return texts('#payees tbody tr.payee td:nth-child(2)'); })()",
        expected: ["almeida", "Costa", "Silva"],
      },
      {
        name: "same last name: by first name",
        expr: "(async () => { for (const f of ['Rui', 'Ana']) { await type('#firstName', f); await type('#lastName', 'Lopes'); await type('#iban', 'X'); await submit('#payeeForm'); } return texts('#payees tbody tr.payee td:nth-child(1)'); })()",
        expected: ["Ana", "Rui"], hidden: true,
      },
      { name: "a blank field adds nothing", expr: "(async () => { await type('#lastName', '   '); await submit('#payeeForm'); return [$$('#payees tbody tr').length, value('#firstName')]; })()", expected: [0, "Coder"] },
      { name: "values are trimmed", expr: "(async () => { await type('#firstName', '  Ana  '); await submit('#payeeForm'); return $('#payees tbody td').textContent; })()", expected: "Ana", hidden: true },
      { name: "follows every instruction in the prompt", expr: "usesName('varOcg')", expected: true },
    ],
  },
  {
    id: "cb-re-filter", lang: "react", level: "Medium", minutes: 25,
    title: "React · transaction filter",
    prompt: "The starter lists every transaction. Add filtering:\n\n- `#search` filters by description: case-insensitive, ignoring spaces around the query.\n- `#type` (`all`, `debit`, `credit`) filters by type.\n- Both apply together. Matching rows keep their original order, one `<li class=\"tx\">` each, as in the starter (`Coffee Lab -3.50`).\n- `#count` reads `N results`, or `1 result` for one.\n- With no match, show `<p id=\"empty\">No transactions match</p>` instead of any rows. Don't render `#empty` otherwise." + REACT_NOTE,
    starter: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const TRANSACTIONS = [
  { id: 1, description: 'Coffee Lab', amount: -3.5, type: 'debit' },
  { id: 2, description: 'Salary October', amount: 2450, type: 'credit' },
  { id: 3, description: 'Rent', amount: -950, type: 'debit' },
  { id: 4, description: 'Coffee beans', amount: -12.9, type: 'debit' },
  { id: 5, description: 'Refund: headphones', amount: 89.99, type: 'credit' },
  { id: 6, description: 'Gym', amount: -35, type: 'debit' },
  { id: 7, description: 'Transfer from Ana', amount: 40, type: 'credit' },
  { id: 8, description: 'Train ticket', amount: -18.4, type: 'debit' },
];

function TransactionList() {
  return (
    <div>
      <input id="search" placeholder="Search" />
      <select id="type">
        <option value="all">All</option>
        <option value="debit">Debits</option>
        <option value="credit">Credits</option>
      </select>
      <p id="count">8 results</p>
      <ul id="results">
        {TRANSACTIONS.map((t) => (
          <li className="tx" key={t.id}>{t.description} {t.amount.toFixed(2)}</li>
        ))}
      </ul>
    </div>
  );
}
` + RENDER("TransactionList"),
    solution: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const TRANSACTIONS = [
  { id: 1, description: 'Coffee Lab', amount: -3.5, type: 'debit' },
  { id: 2, description: 'Salary October', amount: 2450, type: 'credit' },
  { id: 3, description: 'Rent', amount: -950, type: 'debit' },
  { id: 4, description: 'Coffee beans', amount: -12.9, type: 'debit' },
  { id: 5, description: 'Refund: headphones', amount: 89.99, type: 'credit' },
  { id: 6, description: 'Gym', amount: -35, type: 'debit' },
  { id: 7, description: 'Transfer from Ana', amount: 40, type: 'credit' },
  { id: 8, description: 'Train ticket', amount: -18.4, type: 'debit' },
];

function TransactionList() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const q = query.trim().toLowerCase();
  const shown = TRANSACTIONS.filter(
    (t) => (kind === 'all' || t.type === kind) && t.description.toLowerCase().includes(q),
  );
  return (
    <div>
      <input id="search" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
      <select id="type" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="all">All</option>
        <option value="debit">Debits</option>
        <option value="credit">Credits</option>
      </select>
      <p id="count">{shown.length} {shown.length === 1 ? 'result' : 'results'}</p>
      {shown.length ? (
        <ul id="results">
          {shown.map((t) => (
            <li className="tx" key={t.id}>{t.description} {t.amount.toFixed(2)}</li>
          ))}
        </ul>
      ) : (
        <p id="empty">No transactions match</p>
      )}
    </div>
  );
}
` + RENDER("TransactionList"),
    tests: [
      { name: "shows everything at first", expr: "[text('#count'), $$('.tx').length]", expected: ["8 results", 8] },
      { name: "search by description", expr: "(async () => { await type('#search', 'coffee'); return texts('.tx'); })()", expected: ["Coffee Lab -3.50", "Coffee beans -12.90"] },
      { name: "case and surrounding spaces ignored", expr: "(async () => { await type('#search', '  TRAIN '); return texts('.tx'); })()", expected: ["Train ticket -18.40"], hidden: true },
      { name: "filter by type", expr: "(async () => { await choose('#type', 'credit'); return texts('.tx'); })()", expected: ["Salary October 2450.00", "Refund: headphones 89.99", "Transfer from Ana 40.00"] },
      { name: "both filters together, singular count", expr: "(async () => { await type('#search', 'an'); await choose('#type', 'credit'); return [texts('.tx'), text('#count')]; })()", expected: [["Transfer from Ana 40.00"], "1 result"] },
      { name: "nothing matches", expr: "(async () => { await type('#search', 'pizza'); return [text('#empty'), $$('.tx').length, text('#count')]; })()", expected: ["No transactions match", 0, "0 results"] },
      { name: "#empty only when nothing matches", expr: "$('#empty') === null", expected: true, hidden: true },
      { name: "clearing the search shows everything", expr: "(async () => { await type('#search', 'gym'); await type('#search', ''); return text('#count'); })()", expected: "8 results", hidden: true },
    ],
  },
  {
    id: "cb-re-context", lang: "react", level: "Medium", minutes: 20,
    title: "React · currency context",
    prompt: "Prices are in euros. Add a currency switch with React context:\n\n- `App` provides the current currency (`EUR` or `USD`) through a context, and `#toggleCurrency` switches it.\n- `Header` shows `Showing EUR` or `Showing USD` in `#current`.\n- `PriceList` renders one `<li class=\"price\">` per plan: `Basic: €4.50` in euros, `Basic: $5.40` in dollars (price × `RATE`, always 2 decimals).\n\n`Header` and `PriceList` read the currency from context: don't pass them props." + REACT_NOTE,
    starter: `import React, { createContext, useContext, useState } from 'react';
import { createRoot } from 'react-dom/client';

const RATE = 1.2; // 1 EUR = 1.2 USD
const PLANS = [
  { name: 'Basic', eur: 4.5 },
  { name: 'Plus', eur: 12 },
  { name: 'Business', eur: 25 },
];

function Header() {
  return <h1 id="current">Showing EUR</h1>;
}

function PriceList() {
  return (
    <ul>
      {PLANS.map((p) => (
        <li className="price" key={p.name}>{p.name}: €{p.eur}</li>
      ))}
    </ul>
  );
}

function App() {
  return (
    <div>
      <Header />
      <button id="toggleCurrency">Switch currency</button>
      <PriceList />
    </div>
  );
}
` + RENDER("App"),
    solution: `import React, { createContext, useContext, useState } from 'react';
import { createRoot } from 'react-dom/client';

const RATE = 1.2; // 1 EUR = 1.2 USD
const PLANS = [
  { name: 'Basic', eur: 4.5 },
  { name: 'Plus', eur: 12 },
  { name: 'Business', eur: 25 },
];

const CurrencyContext = createContext('EUR');

function Header() {
  const currency = useContext(CurrencyContext);
  return <h1 id="current">Showing {currency}</h1>;
}

function PriceList() {
  const currency = useContext(CurrencyContext);
  const price = (eur) => (currency === 'USD' ? '$' + (eur * RATE).toFixed(2) : '€' + eur.toFixed(2));
  return (
    <ul>
      {PLANS.map((p) => (
        <li className="price" key={p.name}>{p.name}: {price(p.eur)}</li>
      ))}
    </ul>
  );
}

function App() {
  const [currency, setCurrency] = useState('EUR');
  return (
    <CurrencyContext.Provider value={currency}>
      <div>
        <Header />
        <button id="toggleCurrency" onClick={() => setCurrency((c) => (c === 'EUR' ? 'USD' : 'EUR'))}>
          Switch currency
        </button>
        <PriceList />
      </div>
    </CurrencyContext.Provider>
  );
}
` + RENDER("App"),
    tests: [
      { name: "prices in euros", expr: "texts('.price')", expected: ["Basic: €4.50", "Plus: €12.00", "Business: €25.00"] },
      { name: "switch to dollars", expr: "(async () => { await click('#toggleCurrency'); return texts('.price'); })()", expected: ["Basic: $5.40", "Plus: $14.40", "Business: $30.00"] },
      { name: "the header follows", expr: "(async () => { await click('#toggleCurrency'); return text('#current'); })()", expected: "Showing USD" },
      { name: "and switches back", expr: "(async () => { await click('#toggleCurrency'); await click('#toggleCurrency'); return [text('#current'), texts('.price')[0]]; })()", expected: ["Showing EUR", "Basic: €4.50"], hidden: true },
      { name: "reads the currency from context", expr: "/useContext\\s*\\(/.test(source) && /\\.Provider\\b/.test(source)", expected: true },
      { name: "Header and PriceList get no props", expr: "!/<(Header|PriceList)\\s+[A-Za-z{]/.test(source)", expected: true, hidden: true },
    ],
  },
  {
    id: "cb-re-loan", lang: "react", level: "Medium", minutes: 20,
    title: "React · loan calculator",
    prompt: "Make the loan calculator live. The inputs `#amount`, `#rate` (annual %, so `5` means 5%) and `#years` start at `10000`, `5` and `5`. As they change:\n\n- `#payment` reads `Monthly payment: 188.71`, from the usual formula `P × r / (1 − (1 + r)^−n)` with `r` the monthly rate (annual ÷ 100 ÷ 12) and `n` the number of months. At 0% it's simply `P / n`.\n- `#total` reads `Total repaid: 11322.74`, the monthly payment times the months (round only for display, to 2 decimals).\n- If a field is empty or not a number, or the amount or years aren't above 0, or the rate is negative, `#payment` reads `Enter a valid amount, rate and term` and `#total` isn't shown." + REACT_NOTE,
    starter: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function LoanCalculator() {
  return (
    <form>
      <label>Amount <input id="amount" defaultValue="10000" /></label>
      <label>Annual rate (%) <input id="rate" defaultValue="5" /></label>
      <label>Years <input id="years" defaultValue="5" /></label>
      <p id="payment">Monthly payment: </p>
      <p id="total">Total repaid: </p>
    </form>
  );
}
` + RENDER("LoanCalculator"),
    solution: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const num = (v) => (v.trim() === '' ? NaN : Number(v));

function LoanCalculator() {
  const [form, setForm] = useState({ amount: '10000', rate: '5', years: '5' });
  const change = (e) => setForm({ ...form, [e.target.id]: e.target.value });
  const amount = num(form.amount);
  const rate = num(form.rate);
  const years = num(form.years);
  const valid = amount > 0 && years > 0 && rate >= 0;
  let monthly = 0;
  if (valid) {
    const n = years * 12;
    const r = rate / 100 / 12;
    monthly = r === 0 ? amount / n : (amount * r) / (1 - Math.pow(1 + r, -n));
  }
  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <label>Amount <input id="amount" value={form.amount} onChange={change} /></label>
      <label>Annual rate (%) <input id="rate" value={form.rate} onChange={change} /></label>
      <label>Years <input id="years" value={form.years} onChange={change} /></label>
      <p id="payment">{valid ? 'Monthly payment: ' + monthly.toFixed(2) : 'Enter a valid amount, rate and term'}</p>
      {valid && <p id="total">Total repaid: {(monthly * years * 12).toFixed(2)}</p>}
    </form>
  );
}
` + RENDER("LoanCalculator"),
    tests: [
      { name: "the defaults", expr: "[text('#payment'), text('#total')]", expected: ["Monthly payment: 188.71", "Total repaid: 11322.74"] },
      { name: "a mortgage", expr: "(async () => { await type('#amount', '200000'); await type('#rate', '3.5'); await type('#years', '30'); return text('#payment'); })()", expected: "Monthly payment: 898.09" },
      { name: "0% interest", expr: "(async () => { await type('#amount', '1200'); await type('#rate', '0'); await type('#years', '1'); return [text('#payment'), text('#total')]; })()", expected: ["Monthly payment: 100.00", "Total repaid: 1200.00"] },
      { name: "an empty field", expr: "(async () => { await type('#amount', ''); return [text('#payment'), $('#total') === null]; })()", expected: ["Enter a valid amount, rate and term", true] },
      { name: "not a number", expr: "(async () => { await type('#rate', 'abc'); return text('#payment'); })()", expected: "Enter a valid amount, rate and term", hidden: true },
      { name: "0 years", expr: "(async () => { await type('#years', '0'); return text('#payment'); })()", expected: "Enter a valid amount, rate and term", hidden: true },
      { name: "negative rate", expr: "(async () => { await type('#rate', '-1'); return text('#payment'); })()", expected: "Enter a valid amount, rate and term", hidden: true },
      { name: "total of the mortgage", expr: "(async () => { await type('#amount', '200000'); await type('#rate', '3.5'); await type('#years', '30'); return text('#total'); })()", expected: "Total repaid: 323312.18", hidden: true },
    ],
  },
  {
    id: "cb-re-tictactoe", lang: "react", level: "Hard", minutes: 30,
    title: "React · tic-tac-toe",
    prompt: "Make the board playable:\n\n- X moves first. Clicking an empty `.square` puts the current player's mark in it and passes the turn: `#status` reads `Next player: O`, and so on.\n- Clicking a square that's already taken does nothing.\n- Three in a row, column or diagonal: `#status` reads `Winner: X` (or `O`) and the board takes no more moves.\n- All nine filled with no winner: `#status` reads `Draw`.\n- `#reset` empties the board and sets `#status` back to `Next player: X`.\n\nStyling is up to you; the tests only read text." + REACT_NOTE,
    starter: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

function Board() {
  const squares = Array(9).fill(null);
  return (
    <div>
      <p id="status">Next player: X</p>
      <div className="board">
        {squares.map((value, i) => (
          <button className="square" key={i}>{value}</button>
        ))}
      </div>
      <button id="reset">Reset</button>
    </div>
  );
}
` + RENDER("Board"),
    solution: `import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function winnerOf(squares) {
  for (const [a, b, c] of LINES) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
  }
  return null;
}

function Board() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const winner = winnerOf(squares);
  const full = squares.every(Boolean);
  const next = squares.filter(Boolean).length % 2 === 0 ? 'X' : 'O';
  const play = (i) => {
    if (squares[i] || winner) return;
    const copy = squares.slice();
    copy[i] = next;
    setSquares(copy);
  };
  const status = winner ? 'Winner: ' + winner : full ? 'Draw' : 'Next player: ' + next;
  return (
    <div>
      <p id="status">{status}</p>
      <div className="board" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gap: 4 }}>
        {squares.map((value, i) => (
          <button className="square" key={i} style={{ height: 48 }} onClick={() => play(i)}>{value}</button>
        ))}
      </div>
      <button id="reset" onClick={() => setSquares(Array(9).fill(null))}>Reset</button>
    </div>
  );
}
` + RENDER("Board"),
    tests: [
      { name: "empty board, X to play", expr: "[$$('.square').length, texts('.square').join(''), text('#status')]", expected: [9, "", "Next player: X"] },
      { name: "X, then O's turn", expr: "(async () => { await click($$('.square')[0]); return [text($$('.square')[0]), text('#status')]; })()", expected: ["X", "Next player: O"] },
      { name: "a taken square is ignored", expr: "(async () => { await click($$('.square')[0]); await click($$('.square')[0]); return [texts('.square').join(''), text('#status')]; })()", expected: ["X", "Next player: O"] },
      { name: "X wins a row", expr: "(async () => { for (const i of [0, 3, 1, 4, 2]) await click($$('.square')[i]); return text('#status'); })()", expected: "Winner: X" },
      { name: "O wins a diagonal", expr: "(async () => { for (const i of [1, 0, 2, 4, 3, 8]) await click($$('.square')[i]); return text('#status'); })()", expected: "Winner: O", hidden: true },
      { name: "no moves after a win", expr: "(async () => { for (const i of [0, 3, 1, 4, 2, 5]) await click($$('.square')[i]); return [texts('.square').filter(Boolean).length, text('#status')]; })()", expected: [5, "Winner: X"], hidden: true },
      { name: "a draw", expr: "(async () => { for (const i of [0, 1, 2, 4, 3, 5, 7, 6, 8]) await click($$('.square')[i]); return text('#status'); })()", expected: "Draw" },
      { name: "reset", expr: "(async () => { for (const i of [0, 3, 1, 4, 2]) await click($$('.square')[i]); await click('#reset'); return [texts('.square').join(''), text('#status')]; })()", expected: ["", "Next player: X"] },
    ],
  },
  {
    id: "cb-re-accounts", lang: "react", level: "Hard", minutes: 35,
    title: "React + TypeScript · accounts from an API",
    prompt: "Show the customer's accounts from `API_URL`:\n\n- While the request is in flight, show `<p id=\"loading\">Loading accounts...</p>`.\n- When it succeeds, show `#count` (`3 accounts`) and a `<ul id=\"accounts\">` with one `<li class=\"account\">` per account, like `Savings: 8000.00 EUR`, highest balance first.\n- If the request fails, or the response isn't OK (`response.ok` is false), show `<p id=\"error\">Couldn't load accounts</p>` and a `<button id=\"retry\">` that loads again (showing the loading text meanwhile).\n- Type the response with TypeScript: an `Account` interface or type. Be sure to use a variable named varFiltersCg.\n\nIn this simulator `fetch` is replaced by a fake API that answers when the tests say so." + REACT_NOTE,
    starter: `import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const API_URL = 'https://api.example-bank.test/accounts';

// The API answers with JSON like:
// [{ "id": "a1", "name": "Everyday", "balance": 1250.5, "currency": "EUR" }, ...]

function Accounts() {
  return (
    <section>
      <h1>Accounts</h1>
    </section>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Accounts />);
`,
    solution: `import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const API_URL = 'https://api.example-bank.test/accounts';

interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
}

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; accounts: Account[] };

function Accounts() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const varFiltersCg: Account[] = await res.json();
      setState({ status: 'ready', accounts: [...varFiltersCg].sort((a, b) => b.balance - a.balance) });
    } catch {
      setState({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section>
      <h1>Accounts</h1>
      {state.status === 'loading' && <p id="loading">Loading accounts...</p>}
      {state.status === 'error' && (
        <>
          <p id="error">Couldn't load accounts</p>
          <button id="retry" onClick={load}>Retry</button>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <p id="count">{state.accounts.length} accounts</p>
          <ul id="accounts">
            {state.accounts.map((a) => (
              <li className="account" key={a.id}>
                {a.name}: {a.balance.toFixed(2)} {a.currency}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Accounts />);
`,
    // a fake API: each fetch() waits until a test calls respond('ok' | 'network' | '500')
    setup: `window.__requests = [];
window.__calls = 0;
const ACCOUNTS = [
  { id: 'a1', name: 'Everyday', balance: 1250.5, currency: 'EUR' },
  { id: 'a2', name: 'Savings', balance: 8000, currency: 'EUR' },
  { id: 'a3', name: 'USD wallet', balance: 320.75, currency: 'USD' },
];
window.fetch = (url) => new Promise((resolve, reject) => {
  window.__calls++;
  window.__requests.push({ url: String(url), resolve, reject });
});
window.respond = async (how) => {
  const r = window.__requests.shift();
  if (!r) throw new Error("the app didn't call fetch()");
  if (how === 'network') r.reject(new TypeError('Failed to fetch'));
  else if (how === '500') r.resolve({ ok: false, status: 500, json: async () => ({ message: 'Internal error' }) });
  else r.resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(ACCOUNTS)) });
  await settle();
};`,
    tests: [
      { name: "shows the loading text first", expr: "text('#loading')", expected: "Loading accounts..." },
      { name: "calls the API once", expr: "[__requests.length, __requests[0] && __requests[0].url]", expected: [1, "https://api.example-bank.test/accounts"] },
      { name: "lists the accounts, highest balance first", expr: "(async () => { await respond('ok'); return texts('#accounts .account'); })()", expected: ["Savings: 8000.00 EUR", "Everyday: 1250.50 EUR", "USD wallet: 320.75 USD"] },
      { name: "the loading text goes away", expr: "(async () => { await respond('ok'); return $('#loading') === null; })()", expected: true, hidden: true },
      { name: "the count", expr: "(async () => { await respond('ok'); return text('#count'); })()", expected: "3 accounts" },
      { name: "a network error", expr: "(async () => { await respond('network'); return [text('#error'), !!$('#retry'), $('#accounts') === null]; })()", expected: ["Couldn't load accounts", true, true] },
      { name: "HTTP 500 is an error too", expr: "(async () => { await respond('500'); return [text('#error'), $('#accounts') === null]; })()", expected: ["Couldn't load accounts", true], hidden: true },
      { name: "retry loads again", expr: "(async () => { await respond('500'); await click('#retry'); const loading = text('#loading'); await respond('ok'); return [loading, $$('#accounts .account').length, $('#error') === null, __calls]; })()", expected: ["Loading accounts...", 3, true, 2] },
      { name: "the response is typed", expr: "/interface\\s+Account\\b|type\\s+Account\\s*=/.test(source)", expected: true },
      { name: "follows every instruction in the prompt", expr: "usesName('varFiltersCg')", expected: true },
    ],
  },
];

export const CODERBYTE_TASKS: CodingTask[] = [...PY, ...JS, ...REACT];

export const CODERBYTE_ROUNDS: CoderbyteRound[] = [
  {
    id: "python",
    name: "Python assessment",
    blurb:
      "Four algorithm challenges, easy to hard, in Coderbyte's format (masked names, `print(F(input()))` at the bottom), then multiple choice on Python and data.",
    minutes: 120,
    challenges: [
      ["cb-py-runlength", "cb-py-reference", "cb-py-longest"],
      ["cb-py-intersection", "cb-py-brackets", "cb-py-addition"],
      ["cb-py-window", "cb-py-tree", "cb-py-kaprekar"],
      ["cb-py-calculator", "cb-py-fx", "cb-py-ledger"],
    ],
    questions: [
      { section: "py", count: 6 },
      { section: "data", count: 4 },
    ],
  },
  {
    id: "react",
    name: "React assessment",
    blurb:
      "Three React UI challenges with a live preview (easy, medium, hard), one JavaScript algorithm challenge, then multiple choice on React and TypeScript.",
    minutes: 120,
    challenges: [
      ["cb-re-toggle", "cb-re-stepper", "cb-re-iban"],
      ["cb-re-payees", "cb-re-filter", "cb-re-context", "cb-re-loan"],
      ["cb-re-tictactoe", "cb-re-accounts"],
      ["cb-js-repeated", "cb-js-camel", "cb-js-coins"],
    ],
    questions: [{ section: "react", count: 8 }],
  },
];

/** What the research says about taking a Coderbyte assessment (shown on the start page). */
export const CODERBYTE_TIPS = [
  "**One clock, no pause.** Pressing Begin starts a timer for the whole assessment and shows every question at once. Read them all first, then give each challenge a time box (here about 15, 20, 25 and 35 minutes plus 15 for the multiple choice) and keep 10 minutes for checking.",
  "**Write in the editor, stay in the tab.** Pasting code from outside the editor and leaving the editor tab for a while are both flagged in the employer's report (not detected, likely, detected). Webcam proctoring and a video playback of your coding can be switched on too. Turn off notifications and close other apps.",
  "**Use the built-in search if it's there.** Some assessments put a Google search box in the editor; it's allowed, and every search and click is logged for the reviewer, so look up syntax, not solutions.",
  "**Leave the function call at the bottom alone.** `print(StringChallenge(input()))` / `console.log(StringChallenge(readline()))` is how your code gets its input and how it's graded. Return exactly the type and format asked for: often a string such as `\"true\"`, `\"-1\"` or `\"1,4,13\"`. Take stray debug prints out before you submit.",
  "**Read every sentence of the prompt.** Coderbyte prompts can carry an extra instruction, sometimes in the middle of another sentence: \"be sure to use a variable named varFiltersCg\", \"make sure the solution contains the keyword __define-ocg__ in at least one comment\". Do what it says; it's checked, and it exposes answers pasted from an AI tool.",
  "**Samples are not the whole test.** On Coderbyte you may see only the examples; hidden cases grade the submission. (The rounds here give every rule in a prompt a sample and hide the edge cases.) Before submitting, check each sentence of the prompt against your code, then try empty input, a single item, ties, duplicates, negatives and the largest values.",
  "**Partial credit counts.** Each challenge is scored out of 10 by the tests it passes, so a working simple solution to every challenge beats a perfect one and an empty one. Time doesn't add points (speed scoring is retired); correctness does. The usual pass mark is 70%.",
  "**React challenges.** Keep the starter's ids, class names and text exactly, keep `createRoot(document.getElementById('root'))`, and prevent the default on form submits. Get it working with plain `useState` first, styling last.",
  "**Before you start.** Disable ad blockers (they break the editor), use a stable connection and a charged laptop, and remember the invite link may work only once. Submit each challenge, then press the green Submit Assessment button.",
];

export const CODERBYTE_SOURCES = [
  "[Coderbyte: candidate guide to taking an assessment](https://help.coderbyte.com/knowledge/candidate-guide-to-taking-an-assessment)",
  "[Coderbyte: cheating prevention and detection](https://help.coderbyte.com/knowledge/how-does-plagiarism-detection-work)",
  "[Coderbyte: project-based challenges](https://help.coderbyte.com/knowledge/project-based-challenges)",
  "[PracHub: Coderbyte coding assessment questions](https://prachub.com/resources/coderbyte-coding-assessment-questions-what-candidates-should-expect)",
];
