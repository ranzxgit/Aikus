import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const reducedMotion = useReducedMotion();
  return (
    <Modal transparent visible={visible} animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={cancelLabel} onPress={onCancel} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={confirmLabel} onPress={onConfirm} style={[styles.primaryButton, destructive && styles.destructiveButton]}>
            <Text style={styles.primaryText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(30, 21, 17, 0.58)', padding: 22 },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', backgroundColor: '#FFF9F4', borderRadius: 20, padding: 24, gap: 18 },
  title: { color: '#32251F', fontSize: 24, lineHeight: 32, fontWeight: '800' },
  message: { color: '#49382F', fontSize: 18, lineHeight: 27 },
  secondaryButton: { minHeight: 56, borderRadius: 12, borderColor: '#56301F', borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: '#32251F', fontSize: 18, fontWeight: '700' },
  primaryButton: { minHeight: 56, borderRadius: 12, backgroundColor: '#56301F', justifyContent: 'center', alignItems: 'center' },
  destructiveButton: { backgroundColor: '#A32323' },
  primaryText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
});
