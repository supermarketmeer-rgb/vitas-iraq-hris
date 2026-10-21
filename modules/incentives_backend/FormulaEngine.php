<?php
/**
 * Standalone Formula Engine in PHP
 * Safe Recursive Descent Parser & AST Evaluator (No eval, no code injection)
 */

declare(strict_types=1);

class FormulaEngine {
    /**
     * Tokenizes mathematical and logical expression
     */
    public static function tokenize(string $expr): array {
        $tokens = [];
        $i = 0;
        $len = strlen($expr);

        while ($i < $len) {
            $char = $expr[$i];

            if (ctype_space($char)) {
                $i++;
                continue;
            }

            // Numbers
            if (ctype_digit($char) || ($char === '.' && $i + 1 < $len && ctype_digit($expr[$i + 1]))) {
                $numStr = '';
                $startPos = $i;
                while ($i < $len && (ctype_digit($expr[$i]) || $expr[$i] === '.')) {
                    $numStr .= $expr[$i];
                    $i++;
                }
                $tokens[] = ['type' => 'NUMBER', 'value' => $numStr, 'pos' => $startPos];
                continue;
            }

            // Multi-char operators: ==, !=, >=, <=, &&, ||
            $two = substr($expr, $i, 2);
            if (in_array($two, ['==', '!=', '>=', '<=', '&&', '||'], true)) {
                $tokens[] = ['type' => 'OPERATOR', 'value' => $two, 'pos' => $i];
                $i += 2;
                continue;
            }

            // Single operators
            if (in_array($char, ['+', '-', '*', '/', '^', '%', '>', '<', '!'], true)) {
                $tokens[] = ['type' => 'OPERATOR', 'value' => $char, 'pos' => $i];
                $i++;
                continue;
            }

            // Punctuation: (, ), ,
            if (in_array($char, ['(', ')', ','], true)) {
                $tokens[] = ['type' => 'PUNCTUATION', 'value' => $char, 'pos' => $i];
                $i++;
                continue;
            }

            // Identifiers / Functions / Keywords
            if (ctype_alpha($char) || $char === '_') {
                $ident = '';
                $startPos = $i;
                while ($i < $len && (ctype_alnum($expr[$i]) || $expr[$i] === '_')) {
                    $ident .= $expr[$i];
                    $i++;
                }
                $upper = strtoupper($ident);
                if (in_array($upper, ['AND', 'OR', 'NOT'], true)) {
                    $tokens[] = ['type' => 'OPERATOR', 'value' => $upper, 'pos' => $startPos];
                } else {
                    $tokens[] = ['type' => 'IDENTIFIER', 'value' => $ident, 'pos' => $startPos];
                }
                continue;
            }

            throw new InvalidArgumentException("حرف غير معروف في المعادلة: '$char' عند الموضع $i");
        }

        return $tokens;
    }

    /**
     * Parses tokens into AST node
     */
    public static function parse(array $tokens): array {
        $index = 0;

        $peek = function () use (&$index, $tokens): ?array {
            return $tokens[$index] ?? null;
        };

        $consume = function (?string $expected = null) use (&$index, $tokens): array {
            $t = $tokens[$index] ?? null;
            if (!$t) {
                throw new InvalidArgumentException('انتهت المعادلة قبل اكتمال التعبير');
            }
            if ($expected !== null && strtoupper($t['value']) !== strtoupper($expected)) {
                throw new InvalidArgumentException("توقع '$expected' ولكن وجد '{$t['value']}'");
            }
            $index++;
            return $t;
        };

        $parsePrimary = null;
        $parseUnary = null;
        $parseExponentiation = null;
        $parseMultiplication = null;
        $parseAddition = null;
        $parseComparison = null;
        $parseLogicalAnd = null;
        $parseExpression = null;

        $parseExpression = function () use (&$parseLogicalAnd, &$peek, &$consume): array {
            $node = $parseLogicalAnd();
            while ($p = $peek()) {
                $upper = strtoupper($p['value']);
                if ($upper === 'OR' || $p['value'] === '||') {
                    $op = $consume()['value'];
                    $right = $parseLogicalAnd();
                    $node = ['type' => 'BinaryOp', 'operator' => strtoupper($op), 'left' => $node, 'right' => $right];
                } else {
                    break;
                }
            }
            return $node;
        };

        $parseLogicalAnd = function () use (&$parseComparison, &$peek, &$consume): array {
            $node = $parseComparison();
            while ($p = $peek()) {
                $upper = strtoupper($p['value']);
                if ($upper === 'AND' || $p['value'] === '&&') {
                    $op = $consume()['value'];
                    $right = $parseComparison();
                    $node = ['type' => 'BinaryOp', 'operator' => strtoupper($op), 'left' => $node, 'right' => $right];
                } else {
                    break;
                }
            }
            return $node;
        };

        $parseComparison = function () use (&$parseAddition, &$peek, &$consume): array {
            $node = $parseAddition();
            while ($p = $peek()) {
                if (in_array($p['value'], ['==', '!=', '>=', '<=', '>', '<', '='], true)) {
                    $op = $consume()['value'];
                    if ($op === '=') $op = '==';
                    $right = $parseAddition();
                    $node = ['type' => 'BinaryOp', 'operator' => $op, 'left' => $node, 'right' => $right];
                } else {
                    break;
                }
            }
            return $node;
        };

        $parseAddition = function () use (&$parseMultiplication, &$peek, &$consume): array {
            $node = $parseMultiplication();
            while ($p = $peek()) {
                if ($p['value'] === '+' || $p['value'] === '-') {
                    $op = $consume()['value'];
                    $right = $parseMultiplication();
                    $node = ['type' => 'BinaryOp', 'operator' => $op, 'left' => $node, 'right' => $right];
                } else {
                    break;
                }
            }
            return $node;
        };

        $parseMultiplication = function () use (&$parseExponentiation, &$peek, &$consume): array {
            $node = $parseExponentiation();
            while ($p = $peek()) {
                if (in_array($p['value'], ['*', '/', '%'], true)) {
                    $op = $consume()['value'];
                    $right = $parseExponentiation();
                    $node = ['type' => 'BinaryOp', 'operator' => $op, 'left' => $node, 'right' => $right];
                } else {
                    break;
                }
            }
            return $node;
        };

        $parseExponentiation = function () use (&$parseUnary, &$peek, &$consume): array {
            $node = $parseUnary();
            while ($p = $peek()) {
                if ($p['value'] === '^') {
                    $op = $consume()['value'];
                    $right = $parseUnary();
                    $node = ['type' => 'BinaryOp', 'operator' => $op, 'left' => $node, 'right' => $right];
                } else {
                    break;
                }
            }
            return $node;
        };

        $parseUnary = function () use (&$parseUnary, &$parsePrimary, &$peek, &$consume): array {
            $p = $peek();
            if ($p && ($p['value'] === '-' || strtoupper($p['value']) === 'NOT' || $p['value'] === '!')) {
                $op = strtoupper($consume()['value']);
                $arg = $parseUnary();
                return ['type' => 'UnaryOp', 'operator' => $op === '!' ? 'NOT' : $op, 'argument' => $arg];
            }
            return $parsePrimary();
        };

        $parsePrimary = function () use (&$parseExpression, &$peek, &$consume): array {
            $t = $peek();
            if (!$t) {
                throw new InvalidArgumentException('توقع قيمة أو تعبير، لكن تم الوصول إلى نهاية المعادلة');
            }

            if ($t['type'] === 'PUNCTUATION' && $t['value'] === '(') {
                $consume('(');
                $expr = $parseExpression();
                $consume(')');
                return $expr;
            }

            if ($t['type'] === 'NUMBER') {
                $consume();
                return ['type' => 'Literal', 'value' => (float)$t['value']];
            }

            if ($t['type'] === 'IDENTIFIER') {
                $ident = $consume();
                $name = $ident['value'];

                if ($peek() && $peek()['value'] === '(') {
                    $consume('(');
                    $args = [];
                    if ($peek() && $peek()['value'] !== ')') {
                        $args[] = $parseExpression();
                        while ($peek() && $peek()['value'] === ',') {
                            $consume(',');
                            $args[] = $parseExpression();
                        }
                    }
                    $consume(')');

                    $upperName = strtoupper($name);
                    if ($upperName === 'IF') {
                        if (count($args) !== 3) {
                            throw new InvalidArgumentException('دالة IF تتطلب 3 وسائط');
                        }
                        return [
                            'type'       => 'Conditional',
                            'condition'  => $args[0],
                            'consequent' => $args[1],
                            'alternate'  => $args[2],
                        ];
                    }

                    return ['type' => 'FunctionCall', 'name' => $upperName, 'args' => $args];
                }

                return ['type' => 'Variable', 'name' => $name];
            }

            throw new InvalidArgumentException("رمز غير متوقع: '{$t['value']}'");
        };

        $ast = $parseExpression();
        if ($index < count($tokens)) {
            throw new InvalidArgumentException("رموز غير مستهلكة بعد المعادلة: '{$tokens[$index]['value']}'");
        }

        return $ast;
    }

    /**
     * Evaluates AST node with variable scope
     */
    public static function evaluateNode(array $node, array $scope): float {
        switch ($node['type']) {
            case 'Literal':
                return (float)$node['value'];

            case 'Variable':
                $name = $node['name'];
                // Normalize Variable01..10
                if (preg_match('/^(?:VARIABLE|VAR|V)0?([1-9]|10)$/i', $name, $m)) {
                    $idx = (int)$m[1];
                    $name = $idx < 10 ? "Variable0{$idx}" : "Variable{$idx}";
                }
                foreach ($scope as $k => $v) {
                    if (strcasecmp($k, $name) === 0) {
                        return (float)$v;
                    }
                }
                return 0.0;

            case 'UnaryOp':
                $val = self::evaluateNode($node['argument'], $scope);
                if ($node['operator'] === '-') return -$val;
                if ($node['operator'] === 'NOT') return $val == 0.0 ? 1.0 : 0.0;
                return $val;

            case 'BinaryOp':
                $left = self::evaluateNode($node['left'], $scope);
                $right = self::evaluateNode($node['right'], $scope);
                switch ($node['operator']) {
                    case '+': return $left + $right;
                    case '-': return $left - $right;
                    case '*': return $left * $right;
                    case '/': return abs($right) < 1e-9 ? 0.0 : $left / $right;
                    case '%': return abs($right) < 1e-9 ? 0.0 : fmod($left, $right);
                    case '^': return pow($left, $right);
                    case '>': return $left > $right ? 1.0 : 0.0;
                    case '<': return $left < $right ? 1.0 : 0.0;
                    case '>=': return $left >= $right ? 1.0 : 0.0;
                    case '<=': return $left <= $right ? 1.0 : 0.0;
                    case '==': return abs($left - $right) < 1e-6 ? 1.0 : 0.0;
                    case '!=': return abs($left - $right) >= 1e-6 ? 1.0 : 0.0;
                    case 'AND': return ($left != 0.0 && $right != 0.0) ? 1.0 : 0.0;
                    case 'OR':  return ($left != 0.0 || $right != 0.0) ? 1.0 : 0.0;
                    default: return 0.0;
                }

            case 'Conditional':
                $cond = self::evaluateNode($node['condition'], $scope);
                if ($cond != 0.0) {
                    return self::evaluateNode($node['consequent'], $scope);
                } else {
                    return self::evaluateNode($node['alternate'], $scope);
                }

            case 'FunctionCall':
                $args = array_map(fn($a) => self::evaluateNode($a, $scope), $node['args']);
                switch ($node['name']) {
                    case 'MIN': return count($args) ? min($args) : 0.0;
                    case 'MAX': return count($args) ? max($args) : 0.0;
                    case 'ROUND':
                        $dec = isset($args[1]) ? (int)$args[1] : 0;
                        return count($args) ? round($args[0], $dec) : 0.0;
                    case 'ABS': return count($args) ? abs($args[0]) : 0.0;
                    case 'FLOOR': return count($args) ? floor($args[0]) : 0.0;
                    case 'CEIL': return count($args) ? ceil($args[0]) : 0.0;
                    default: return 0.0;
                }
        }
        return 0.0;
    }

    /**
     * Complete evaluation interface
     */
    public static function evaluate(string $expr, array $variables): float {
        if (trim($expr) === '') return 0.0;
        $tokens = self::tokenize($expr);
        $ast = self::parse($tokens);
        return round(self::evaluateNode($ast, $variables), 2);
    }
}
