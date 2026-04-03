import React, { type ErrorInfo, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Catches render errors so release builds show a message instead of closing immediately.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary:", error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "#fafafa",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#18181b" }}>
            App error
          </Text>
          <Text style={{ marginTop: 12, color: "#52525b" }}>
            {this.state.error.message}
          </Text>
          <ScrollView style={{ marginTop: 16, maxHeight: 200 }}>
            <Text selectable style={{ fontSize: 12, color: "#71717a", fontFamily: "monospace" }}>
              {this.state.error.stack ?? ""}
            </Text>
          </ScrollView>
          <Text style={{ marginTop: 16, fontSize: 12, color: "#a1a1aa" }}>
            On Android, also run adb logcat and filter for ReactNativeJS or AndroidRuntime.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
