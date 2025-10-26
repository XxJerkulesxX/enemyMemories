Option Strict On
Imports System
Imports System.Collections.Generic

Module Program
    Sub Main(args As String())
        Console.WriteLine("Hello from VB.NET in GitHub Codespaces!")

        ' --- Object / Nothing demo (parallel to JS undefined idea) ---
        Dim o As Object = Nothing
        Console.WriteLine($"o Is Nothing? {o Is Nothing}")   ' True

        o = 5
        Console.WriteLine($"o = {o}, type = {o.GetType().FullName}")  ' System.Int32

        o = "now a string"
        Console.WriteLine($"o = {o}, type = {o.GetType().FullName}")  ' System.String

        ' --- Dictionary demo (JS Map-like) ---
        Dim dict As New Dictionary(Of String, Object) From {
            {"name", "Nataani"},
            {"score", 42},
            {"ok", True}
        }

        Console.WriteLine("Dictionary contents:")
        For Each kv In dict
            Dim t = If(kv.Value Is Nothing, "Nothing", kv.Value.GetType().Name)
            Console.WriteLine($"  {kv.Key} -> {kv.Value} (type {t})")
        Next

        Console.WriteLine("Done.")
    End Sub
End Module
