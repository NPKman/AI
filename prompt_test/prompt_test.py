#!/usr/bin/env python3
"""Simple prompt-based code tester."""

def main():
    print("Enter a Python expression to evaluate:\n")
    expr = input(">>> ")
    try:
        result = eval(expr)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
