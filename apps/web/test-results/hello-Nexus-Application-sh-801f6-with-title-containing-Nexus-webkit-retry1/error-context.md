# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Sign in to your account" [level=2] [ref=e4]
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]: Email address
          - textbox "Email address" [ref=e11]
        - generic [ref=e12]:
          - generic [ref=e13]: Password
          - textbox "Password" [ref=e15]
        - button "Sign in" [ref=e17]
      - paragraph [ref=e19]:
        - text: Don't have an account?
        - link "Sign up" [ref=e20]:
          - /url: /sign-up
  - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
    - img [ref=e27] [cursor=pointer]
  - alert [ref=e32]
```