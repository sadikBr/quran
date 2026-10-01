import AyahActionsLoading from "@/features/quran/components/ayah-actions-loading";
import AyahActionsModal from "@/features/quran/components/ayah-actions-modal";

export default function Loading() {
    return (
        <AyahActionsModal>
            <AyahActionsLoading />
        </AyahActionsModal>
    );
}
